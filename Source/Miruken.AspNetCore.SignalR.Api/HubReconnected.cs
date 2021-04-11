namespace Miruken.AspNetCore.SignalR.Api
{
    public record HubReconnected(
        HubConnectionInfo ConnectionInfo,
        string            NewConnectionId
    ) : HubEvent(ConnectionInfo);
}
