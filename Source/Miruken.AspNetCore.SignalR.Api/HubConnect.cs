namespace Miruken.AspNetCore.SignalR.Api;

using System;
using Miruken.Api;

public record HubConnect(Uri Url = null) : IRequest<HubConnectionInfo>;