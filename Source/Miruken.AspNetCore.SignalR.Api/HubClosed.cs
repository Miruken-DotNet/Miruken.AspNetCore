namespace Miruken.AspNetCore.SignalR.Api
{
    using System;

    public record HubClosed(
        HubConnectionInfo ConnectionInfo,
        Exception         Exception
    ) : HubEvent(ConnectionInfo);
}
