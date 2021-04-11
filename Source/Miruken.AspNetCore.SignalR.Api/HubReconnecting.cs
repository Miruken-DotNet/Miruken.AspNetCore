namespace Miruken.AspNetCore.SignalR.Api
{
    using System;

    public record HubReconnecting(
        HubConnectionInfo ConnectionInfo,
        Exception         Exception
    ) : HubEvent(ConnectionInfo);
}
