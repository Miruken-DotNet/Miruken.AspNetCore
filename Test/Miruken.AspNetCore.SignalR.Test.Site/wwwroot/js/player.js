"use strict";

define(['exports', '@miruken/core', '@miruken/http', './player-api'], function (exports, miruken, http, playerApi) { 'use strict';

    const handler = new miruken.HandlerBuilder()
        .withSignalR()
        .build();
    
    document.getElementById("createPlayer").disabled = true;

    handler.$hubConnect("/hub/miruken").then(_ => {
        document.getElementById("createPlayer").disabled = false;
        document.getElementById("createPlayer").addEventListener("click", event => {
            const name = document.getElementById("playerName").value,
                  dob  = document.getElementById("playerDOB").value;
            createPlayer(handler, name, dob);
            event.preventDefault();
        });
    }).catch(error => console.error(error));

    handler.$accepts(playerApi.PlayerCreated, created => {
        const player = created.player,
              li     = document.createElement("li");
        li.textContent = `Player ${player.id} created (${player.name})`;
        document.getElementById("messagesList").appendChild(li);
    });

    handler.$accepts(playerApi.PlayerUpdated, created => {
        const player = created.player,
              li     = document.createElement("li");
        li.textContent = `Player ${player.id} updated (${player.name})`;
        document.getElementById("messagesList").appendChild(li);
    });
    
    function createPlayer(handler, name, dob) {
        const player = new playerApi.Player().extend({ name, dob });
        handler.$send(new playerApi.CreatePlayer(player)
                .routeTo("hub:/hub/miruken")).then(response => {
            const newPlayer = response.player,
                  li        = document.createElement("li");
            li.textContent = `Player ${newPlayer.id} created (${newPlayer.name})`;
            document.getElementById("messagesList").appendChild(li);
            handler.$publish(new playerApi.PlayerCreated(newPlayer)
                   .routeTo("hub:/hub/miruken"));
        }).catch(err => {
            return console.error(err.toString());
        });
    }
});

