/*
 * Copyright 2011-2014 Alex Belozerov, Ilya Stepanov
 *
 * This file is part of PerfectPixel.
 *
 * PerfectPixel is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * PerfectPixel is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with PerfectPixel.  If not, see <http://www.gnu.org/licenses/>.
 */

// options
var ExtOptions;
var PerfectPixel;

var trackEvent = function(senderId, eventType, integerValue, stringValue) {
    if (ExtOptions.enableStatistics == false) {
        return;
    }

    console.log("PP track event", "senderId: " + senderId + "; eventType: " + eventType);
    ExtensionService.sendMessage({
            type: PP_RequestType.TrackEvent,
            senderId: senderId,
            eventType: eventType,
            integerValue: integerValue,
            stringValue: stringValue
        },
        function (response) {
            if (!response) {
                console.log("PP error", "Tracking error: " + senderId + ", " + eventType);
            }
        }
    );
};

function activatePanel(state)  {
    if (this.panelView) {

        // if(this.panelView.isFrozen()) {
        //     this.panelView.unfreeze();
        // } else {
        //     this.panelView.freeze();
        // }
        //this.panelView.destroy();
        //delete this.panelView;
    }
    else {
        ExtensionService.sendMessage({
            type: PP_RequestType.GetExtensionOptions
        }, $.proxy(function (theOptions) {
            ExtOptions = theOptions;
            if (!ExtOptions.debugMode) {
                // disable console messages
                if (!window.console) window.console = {};
                var methods = ["log", "debug", "warn", "info", "time", "timeEnd"];
                for (var i = 0; i < methods.length; i++) {
                    console[methods[i]] = function () { };
                }
            }

            // Convert storage format from prev version of plugin if needed
            Converter.apply();
            // Initialize model and view
            PerfectPixel = new PerfectPixelModel({ id: 1 });
            this.panelView = new PanelView({state: state});
        }, this));

    }
};

function togglePanel(state) {
    if(!this.panelView) {
        activatePanel(state);
    } else {
        this.panelView.togglePanelShown();
    }
};

// Listener for events from background.js
ExtensionService.onMessage.addListener(
    function(request, sender, sendResponse) {

        if(request.type == PP_Background_RequestType.NotificationsUpdated)
        {
            PerfectPixel.notificationModel.initialize();
        }
    });
