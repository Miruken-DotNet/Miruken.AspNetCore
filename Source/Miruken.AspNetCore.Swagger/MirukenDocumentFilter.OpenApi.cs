﻿namespace Miruken.AspNetCore.Swagger
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Reflection;
    using AutoFixture;
    using AutoFixture.Kernel;
    using Callback;
    using Callback.Policy.Bindings;
    using Http;
    using Http.Format;
    using Microsoft.OpenApi.Any;
    using Microsoft.OpenApi.Models;
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization;
    using Swashbuckle.AspNetCore.SwaggerGen;
    using OperationType = Microsoft.OpenApi.Models.OperationType;

    public class MirukenDocumentFilter : IDocumentFilter
    {
        private readonly Predicate<OpenApiOperation> _operationFilter;
        private readonly Fixture _examples;

        private static readonly MethodInfo CreateExampleMethod =
            typeof(MirukenDocumentFilter).GetMethod(nameof(CreateExample),
         BindingFlags.Static | BindingFlags.NonPublic);

        private static readonly JsonSerializerSettings SerializerSettings
            = new()
            {
                Formatting                     = Formatting.Indented,
                NullValueHandling              = NullValueHandling.Ignore,
                ContractResolver               = new CamelCasePropertyNamesContractResolver(),
                TypeNameHandling               = TypeNameHandling.Auto,
                TypeNameAssemblyFormatHandling = TypeNameAssemblyFormatHandling.Simple,
                Converters                     = { EitherJsonConverter.Instance }
            };

        private static readonly string[] JsonFormats = { "application/json" };

        public MirukenDocumentFilter(Predicate<OpenApiOperation> operationFilter)
        {
            _operationFilter = operationFilter;
            _examples        = CreateExamplesGenerator();
        }

        public void Apply(OpenApiDocument document, DocumentFilterContext context)
        {
            if (_operationFilter != null)
            {
                var pathsToRemove = document.Paths
                    .Where(pathItem => pathItem.Value.Operations.Values.Any(op =>
                        _operationFilter?.Invoke(op) == false))
                    .ToList();

                foreach (var item in pathsToRemove)
                    document.Paths.Remove(item.Key);
            }

            var bindings = Handles.Policy.GetMethods();
            AddPaths(document, context, "process", bindings);
        }

        public static bool NoInfrastructure(OpenApiOperation operation)
        {
            return operation == null || !operation.Tags.Any(tag =>
                       InfrastructureTags.Any(t => tag.Name.StartsWith(t)));
        }

        private static readonly string[] InfrastructureTags = { "Miruken", "HttpRoute"};

        private static string ModelToSchemaId(Type type)
        {
            if (type.IsGenericType &&
                type.GetGenericTypeDefinition() == typeof(Message<>))
            {
                var message = type.GetGenericArguments()[0];
                return $"{typeof(Message).FullName}<{message.FullName}>";
            }
            return type.FullName;
        }

        private void AddPaths(OpenApiDocument document, DocumentFilterContext context,
            string resource, IEnumerable<PolicyMemberBinding> bindings)
        {
            foreach (var (key, path) in BuildPaths(resource, context, bindings))
            {
                if (!document.Paths.ContainsKey(key))
                    document.Paths.Add(key, path);
            }
        }

        private IEnumerable<Tuple<string, OpenApiPathItem>> BuildPaths(
            string resource, DocumentFilterContext context,
            IEnumerable<PolicyMemberBinding> bindings)
        {
            var validationErrorsSchema = context.SchemaGenerator.GenerateSchema(
                typeof(ValidationErrors[]), context.SchemaRepository);
            validationErrorsSchema.Example = CreateExampleJson(new[]
            {
                new ValidationErrors
                {
                    PropertyName = "SomeProperty",
                    Errors       = new [] { "'Some Property' is required" },
                    Nested       = new []
                    {
                        new ValidationErrors
                        {
                            PropertyName = "NestedProperty",
                            Errors       = new [] { "'Nested Property' not in range"}
                        }
                    }
                }
            });

            return bindings.Select(x =>
            {
                var requestType = x.Key as Type;
                if (requestType == null || requestType.IsAbstract ||
                    requestType.ContainsGenericParameters)
                    return null;

                var responseType    = x.Dispatcher.LogicalReturnType;
                var handler         = x.Dispatcher.Owner.HandlerType;
                var assembly        = requestType.Assembly.GetName();
                var tag             = $"{assembly.Name} - {assembly.Version}";
                var requestSchema   = GetMessageSchema(requestType, context);
                var responseSchema  = GetMessageSchema(responseType, context);
                var requestPath     = HttpOptionsExtensions.GetRequestPath(requestType);
                var handlerAssembly = handler.Assembly.GetName();
                var handlerNotes    = $"Handled by {handler.FullName} in {handlerAssembly.Name} - {handlerAssembly.Version}";

                var operation = new OpenApiOperation
                {
                    Summary     = requestSchema.Description,
                    OperationId = requestType.FullName,
                    Description = handlerNotes,
                    Tags        = new List<OpenApiTag> { new() { Name = tag } },
                    RequestBody = new OpenApiRequestBody
                    {
                        Description = "request to process",
                        Content     = JsonFormats.Select(f =>
                            new { Format = f, Media = new OpenApiMediaType
                            {
                                Schema  = requestSchema,
                                Example = requestSchema.Example
                            } }).ToDictionary(f => f.Format, f => f.Media),
                        Required = true
                    },
                    Responses =
                    {
                        {
                            "200", new OpenApiResponse
                            {
                                Description = "OK",
                                Content = JsonFormats.Select(f =>
                                    new { Format = f, Media = new OpenApiMediaType
                                    {
                                        Schema  = responseSchema,
                                        Example = responseSchema.Example
                                    } }).ToDictionary(f => f.Format, f => f.Media)
                            }
                        },
                        {
                            "422", new OpenApiResponse
                            {
                                Description = "Validation Errors",
                                Content = JsonFormats.Select(f =>
                                    new { Format = f, Media = new OpenApiMediaType
                                    {
                                        Schema = validationErrorsSchema
                                    } }).ToDictionary(f => f.Format, f => f.Media)
                            }
                        }
                    }
                };

                if (_operationFilter.Invoke(operation) == false)
                    return null;

                return Tuple.Create($"/{resource}/{requestPath}", new OpenApiPathItem
                {
                    Operations =
                    {
                        { OperationType.Post, operation }
                    }
                });
            }).Where(p => p != null);
        }

        private OpenApiSchema GetMessageSchema(Type message, DocumentFilterContext context)
        {
            var repository = context.SchemaRepository;
            var generator  = context.SchemaGenerator;

            if (message == null || message == typeof(void) || message == typeof(object))
            {
                if (!repository.TryLookupByType(typeof(Message), out var messageSchema))
                {
                    var schemaId = ModelToSchemaId(typeof(Message));
                    repository.RegisterType(message, schemaId);
                    messageSchema = generator.GenerateSchema(typeof(Message), repository);
                    repository.AddDefinition(schemaId, messageSchema);
                    messageSchema.Example = CreateExampleJson(new Message());
                }
                return messageSchema;
            }

            var genericMessage = typeof(Message<>).MakeGenericType(message);
            if (!repository.TryLookupByType(genericMessage, out var schema))
            {
                var schemaId = ModelToSchemaId(genericMessage);
                repository.RegisterType(genericMessage, schemaId);
                schema = generator.GenerateSchema(genericMessage, repository);
                repository.AddDefinition(schemaId, schema);
                schema.Example = CreateExampleMessage(message);
            }
            return schema;
        }

        private IOpenApiAny CreateExampleMessage(Type message)
        {
            try
            {
                var creator = CreateExampleMethod.MakeGenericMethod(message);
                var example = creator.Invoke(null, new object[] { _examples });
                return CreateExampleJson(example);
            }
            catch
            {
                return null;
            }
        }

        private static OpenApiString CreateExampleJson(object example)
        {
            var jsonString = JsonConvert.SerializeObject(example, SerializerSettings);
            return new OpenApiString(jsonString);
        }

        private static Message<T> CreateExample<T>(ISpecimenBuilder builder)
        {
            return new() { Payload = builder.Create<T>() };
        }

        private static Fixture CreateExamplesGenerator()
        {
            var generator     = new Fixture { RepeatCount = 1 };
            var customization = new SupportMutableValueTypesCustomization();
            customization.Customize(generator);
            return generator;
        }
    }

    public class Message<T>
    {
        [JsonProperty(TypeNameHandling = TypeNameHandling.All)]
        public T Payload { get; set; }
    }

    public class ValidationErrors
    {
        public string             PropertyName { get; set; }
        public string[]           Errors       { get; set; }
        public ValidationErrors[] Nested       { get; set; }
    }
}


