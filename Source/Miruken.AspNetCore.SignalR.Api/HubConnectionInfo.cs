using System;

namespace Miruken.AspNetCore.SignalR.Api
{
    public record HubConnectionInfo(Uri Url, string Id);
}
