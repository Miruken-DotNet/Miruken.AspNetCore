namespace Miruken.AspNetCore.SignalR
{
    using System;
    using System.Text.Json;
    using System.Threading;
    using System.Threading.Tasks;
    using Api;
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

        public class Message
        {
            public object Payload { get; set; }
        }

        public MessageHub(IHandler handler)
        {
            _handler = handler ?? throw new ArgumentNullException(nameof(handler));
        }

        public async Task<Try<Message, Message>> Process(Message message)
        {
            var context = Context;
            var (request, system) = ExtractRequest(message?.Payload);

            try
            {
                var response = await _handler
                    .With(context)
                    .With(context.User ?? Thread.CurrentPrincipal)
                    .Send(request);
                
                return new Try<Message, Message>.Success(
                    CreateResult(response, system, CreateSerializerSettings()));
            }
            catch (Exception exception)
            {
                return new Try<Message, Message>.Failure(
                    CreateErrorResult(exception, system, CreateSerializerSettings()));
            }
        }

        public async Task Publish(Message message)
        {
            var context = Context;
            var (notification, _) = ExtractRequest(message?.Payload);

            await _handler
                .With(context)
                .With(context.User ?? Thread.CurrentPrincipal)
                .Publish(notification);

            await Clients.Others.SendAsync("Publish", message);
        }

        private static (object, bool) ExtractRequest(object payload)
        {
            if (payload == null)
                throw new ArgumentException("Request payload is missing.");

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
            var result = new Message();
            if (response == null) return result;

            var json = JsonConvert.SerializeObject(
                new Message { Payload = response }, settings);
            
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
        
        private JsonSerializerSettings CreateSerializerSettings()
        {
            var settings = HttpFormatters.Route.SerializerSettings.Copy();
            settings.Converters.Add(new ExceptionJsonConverter(_handler));
            return settings;
        }
    }
}
