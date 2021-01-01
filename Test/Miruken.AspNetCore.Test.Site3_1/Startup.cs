namespace Miruken.AspNetCore.Test.Site3_1
{
    using Microsoft.AspNetCore.Builder;
    using Microsoft.Extensions.DependencyInjection;
    using Microsoft.OpenApi.Models;
    using Register;
    using Swagger;
    using Tests;
    using Validate;

    public class Startup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            services.AddCors();
            
            services.AddMvc(config =>
            {
                config.Filters.Add(typeof(ApiExceptionFilter));
            });

            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo
                {
                    Version     = "v1",
                    Title       = "Test Api",
                    Description = "Swagger Integration with Miruken"
                });
                c.AddMiruken();
            });

            services.AddMiruken(configure => configure
                .PublicSources(sources => sources.FromAssemblyOf<PlayerHandler>())
                .WithAspNet(options => options.AddControllers())
                .WithValidation()
            );
        }

        public void Configure(IApplicationBuilder app)
        {
            app.UseCors(builder => 
                builder.AllowAnyOrigin()
                       .AllowAnyMethod()
                       .AllowAnyHeader()
            );
            
            app.UseRouting()
                .UseEndpoints(endpoints => endpoints.MapControllers());

            app.UseSwagger()
                .UseSwaggerUI(c =>
                {
                    c.DisplayRequestDuration();
                    c.DefaultModelsExpandDepth(-1);
                    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Test Api");
                });
        }
    }
}