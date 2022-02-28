namespace Miruken.AspNetCore.Swagger;

using System;
using Microsoft.Extensions.DependencyInjection;
using Swashbuckle.AspNetCore.SwaggerGen;
using Microsoft.OpenApi.Models;

public static class SwaggerGenExtensions
{
    public static SwaggerGenOptions AddMiruken(this SwaggerGenOptions options,
        Predicate<OpenApiOperation> operationFilter = null)
    {
        options.DocumentFilter<MirukenDocumentFilter>(operationFilter ?? (_ => true));
        return options;
    }
}