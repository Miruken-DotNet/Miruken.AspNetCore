namespace Miruken.AspNetCore.SignalR;

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Api;
using Api.Schedule;
using Callback;
using Functional;
using Http;
using Http.Format;
using Map;
using Microsoft.AspNetCore.SignalR;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using NewtonsoftJsonSerializer = Newtonsoft.Json.JsonSerializer;

public class MessageHub : Hub
{
    private readonly IHandler _handler;

    private static readonly NewtonsoftJsonSerializer JsonSerializer =
        NewtonsoftJsonSerializer.Create(HttpFormatters.Route.SerializerSettings);
        
    public MessageHub(IHandler handler)
    {
        _handler = handler ?? throw new ArgumentNullException(nameof(handler));
    }

    public async Task<Try<Message, Message>> Process(Message message)
    {
        var context  = Context;
        var settings = CreateSerializerSettings();
        var (request, system) = ExtractRequest(message?.Payload);
            
        try
        {
            var response = await _handler
                .With(context)
                .With(context.User ?? Thread.CurrentPrincipal)
                .Send(request);

            return new Try<Message, Message>.Success(
                CreateResult(response, system, settings));
        }
        catch (Exception exception)
        {
            return new Try<Message, Message>.Failure(
                CreateErrorResult(exception, system, settings));
        }
        finally
        {
            if (request is Scheduled scheduled)
            {
                var notifications = CollectNotifications(scheduled)
                    .Select(notification => Clients.Others.SendAsync(
                        "Publish", CreateResult(notification, system, settings)));
                await Task.WhenAll(notifications);
            }
        }
    }

    public async Task Publish(Message message)
    {
        var context = Context;
        var (notification, _) = ExtractRequest(message?.Payload);

        try
        {
            await _handler
                .With(context)
                .With(context.User ?? Thread.CurrentPrincipal)
                .Publish(notification);
        }
        finally
        {
            await Clients.Others.SendAsync("Publish", message);
        }
    }

    private static (object, bool) ExtractRequest(object payload)
    {
        if (payload == null)
            throw new ArgumentException("The request payload is missing.");

        return payload switch
        {
            JsonElement json => /* System.Text.Json */
                (JsonConvert.DeserializeObject(json.GetRawText(),
                    HttpFormatters.Route.SerializerSettings), true),
            JObject json =>     /* Newtonsoft.Json */
                (JsonSerializer.Deserialize(new JTokenReader(json)), false),
            _ => throw new InvalidOperationException(
                $"Unrecognized payload type '{payload.GetType().FullName}.'")
        };
    }

    private static Message CreateResult(
        object response, bool system, JsonSerializerSettings settings)
    {
        var result = new Message { Payload = response };
        if (response == null) return result;

        var json = JsonConvert.SerializeObject(result, settings);
            
        result.Payload = system 
            /* System.Text.Json */
            ? JsonDocument.Parse(json).RootElement.GetProperty("payload")
            /* Newtonsoft.Json */
            : JObject.Parse(json)["payload"];  

        return result;
    }
        
    private Message CreateErrorResult(
        Exception exception, bool system, JsonSerializerSettings settings)
    {
        var error = _handler.BestEffort()
                        .Map<object>(exception, typeof(Exception)) 
                    ?? new ExceptionData(exception);

        return CreateResult(error, system, settings);
    }

    private static IEnumerable<object> CollectNotifications(Scheduled scheduled)
    {
        var queue = new Queue<Scheduled>();
        queue.Enqueue(scheduled);
            
        while (queue.Count > 0)
        {
            var requests = queue.Dequeue().Requests;
            if (requests == null || requests.Length == 0) continue;
                
            foreach (var request in requests)
            {
                switch (request)
                {
                    case Publish publish:
                        if (publish.Message != null)
                            yield return publish.Message;
                        break;
                    case Scheduled nested:
                        queue.Enqueue(nested);
                        break;
                }
            }
        }
    }
        
    private JsonSerializerSettings CreateSerializerSettings()
    {
        var settings = HttpFormatters.Route.SerializerSettings.Copy();
        settings.Converters.Add(new ExceptionJsonConverter(_handler));
        return settings;
    }
}