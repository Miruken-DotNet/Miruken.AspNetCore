namespace Miruken.AspNetCore.SignalR.Api
{
    public abstract record HubEvent(HubConnectionInfo ConnectionInfo = null);
}
