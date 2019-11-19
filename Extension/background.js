﻿/*

Copyright 2011-2014 Alex Belozerov, Ilya Stepanov

This file is part of PerfectPixel.

PerfectPixel is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

PerfectPixel is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with PerfectPixel.  If not, see <http://www.gnu.org/licenses/>.

*/

//    PPFileManager.Init(function () {
//            PPFileManager._DeleteAllFiles();
//    });

var settings = new Store('settings', {
    debugMode: false,
    customCssCode: '',
    rememberPanelOpenClosedState: false,
    enableDeleteLayerConfirmationMessage: true,
    allowPositionChangeWhenLocked: true,
    allowHotkeysPositionChangeWhenLocked: true,
    enableHotkeys: true,
    enableMousewheelOpacity: true,
    NewLayerMoveToScrollPosition: true,
    NewLayerMakeActive: true,
    NewLayerShow: true,
    NewLayerUnlock: true,
    enableStatistics: true,
    disableSupportedByAd: false
    // + "version" property in content script = current extension version from manifest
    // + "defaultLocale" property in content script = default locale from manifest
});

var _gaq = _gaq || [];
_gaq.push(['_setAccount', 'UA-26666773-2']);

$(document).ready(function() {
    if (!settings.get('debugMode')) {
        if (!window.console) window.console = {};
        var methods = ['log', 'debug', 'warn', 'info'];
        for (var i = 0; i < methods.length; i++) {
            console[methods[i]] = function() {};
        }
    }

    if (settings.get('enableStatistics')) {
        var ga = document.createElement('script');
        ga.type = 'text/javascript';
        ga.async = true;
        ga.src = 'https://ssl.google-analytics.com/ga.js';
        //ga.src = 'https://ssl.google-analytics.com/u/ga_debug.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ga, s);
    }
    // because default icon is "disabled" we need to check all tabs
    chrome.tabs.getAllInWindow(null, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
            check_if_PP_available_for_tab(tabs[i]);
        }
    });
});

function get_days_since_epoch() {
    start_of_epoch = moment()
        .year(2016)
        .month(0)
        .date(1)
        .hours(0)
        .minutes(0)
        .seconds(0)
        .milliseconds(0);
    return moment().diff(start_of_epoch, 'days');
}

var prev_browser_focused = false;
var secondsOnCurrentDomain = 0;
var timeOnSitesData = {};
var siteGoals = {};
setInterval(
    chrome.windows.getCurrent(function(browser) {
        focused = browser.focused;
        if (focused != prev_browser_focused) prev_browser_focused = focused;
    }),
    500
);

setInterval(() => {
    if (!prev_browser_focused) return;
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
        if (tabs.length > 0) active_tab = tabs[0];
        if (!active_tab) return;
        if (!active_tab.url.startsWith('http://') && !active_tab.url.startsWith('https://')) return;
        //if iframed_domain_to_track?
        //  current_domain = iframed_domain_to_track
        //else
        //  current_domain = url_to_domain(active_tab.url)
        if (active_tab.url.indexOf('://') > -1) {
            current_domain = [active_tab.url.split('/')[0], '//', active_tab.url.split('/')[2]].join('');
        } else {
            current_domain = active_tab.url.split('/')[0];
        }

        //if (current_idlestate != 'active') and (not is_video_domain(current_domain))
        //  return
        current_day = get_days_since_epoch();
        if (badSites.includes(current_domain)) {
            var pp_tab_state = PP_state[active_tab.id];
            if (!pp_tab_state) {
                PP_state[active_tab.id] = 'open';
                injectIntoTab(active_tab.id);
            }
        }
    });
}, 1000);

setInterval(() => {
    if (!prev_browser_focused) return;
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, function(tabs) {
        if (tabs.length > 0) active_tab = tabs[0];
        if (!active_tab) return;
        if (!active_tab.url.startsWith('http://') && !active_tab.url.startsWith('https://')) return;
        //if iframed_domain_to_track?
        //  current_domain = iframed_domain_to_track
        //else
        //  current_domain = url_to_domain(active_tab.url)
        if (active_tab.url.indexOf('://') > -1) {
            current_domain = [active_tab.url.split('/')[0], '//', active_tab.url.split('/')[2]].join('');
        } else {
            current_domain = active_tab.url.split('/')[0];
        }

        //if (current_idlestate != 'active') and (not is_video_domain(current_domain))
        //  return
        timeOnSitesData = {};
        badSites.forEach(site => {
            timeOnSitesData[site] = {};
        });

        current_day = get_days_since_epoch();
        badSites.forEach(site => {
            chrome.cookies.getAll({ url: site }, function(cookies) {
                var d = new Date();
                var secondsSinceEpoch = d.getTime() / 1000;
                let lastSavedDayCookie = cookies.find(cookie => cookie.name === 'LastSavedDay');
                if (lastSavedDayCookie && parseInt(lastSavedDayCookie.value) === current_day) {
                    var todaySecondsCookie = cookies.find(cookie => cookie.name === 'SecondsOnDomainToday');
                    if (todaySecondsCookie) {
                        timeOnSitesData[site].secondsOnCurrentDomain = todaySecondsCookie.value;
                    } else {
                        timeOnSitesData[site].secondsOnCurrentDomain = 0;
                    }
                } else {
                    timeOnSitesData[site].secondsOnCurrentDomain = 0;
                    chrome.cookies.set({
                        url: site,
                        name: 'LastSavedDay',
                        value: String(current_day),
                        expirationDate: secondsSinceEpoch + 60 * 60 * 24
                    });
                }
                if (current_domain === site) {
                    timeOnSitesData[site].isCurrentDomain = true;
                    chrome.cookies.set({
                        url: current_domain,
                        name: 'SecondsOnDomainToday',
                        value: String(++timeOnSitesData[site].secondsOnCurrentDomain),
                        expirationDate: secondsSinceEpoch + 60 * 60 * 24
                    });
                } else {
                    timeOnSitesData[site].isCurrentDomain = false;
                }
            });
        });
    });
}, 1000);

// here we store panel' state for every tab
var PP_state = [];

// For debug add these lines to manifest
//  "content_scripts": [{
//      "matches": ["<all_urls>"],
//	  "css": [ "style.css", "jquery-ui.css" ],
//      "js": [ "jquery-1.6.2.min.js", "jquery-ui.js", "pp-shared.js", "storage/pp-storage-localStorage.js", "storage/pp-storage-filesystem.js", "pp-content.js"]
//  }]

function togglePanel(tabId) {
    chrome.tabs.executeScript(tabId, { code: 'togglePanel();' });
}

function activatePanel(tabId) {
    chrome.tabs.executeScript(tabId, { code: 'activatePanel();' });
}

function injectIntoTab(tabId, after_injected_callback) {
    if (settings.get('enableStatistics')) {
        _gaq.push(['_trackPageview']); // Tracking

        // Track settings on each load
        var settingsAsObj = settings.toObject();
        for (var optionName in settingsAsObj) {
            var optionValue = settingsAsObj[optionName];
            var uncapitalizedOptionName = optionName.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
            trackEvent('settings', uncapitalizedOptionName, null, String(optionValue), true); // Put in queue
        }
    }

    chrome.tabs.insertCSS(tabId, { file: 'styles/style.css' });
    chrome.tabs.insertCSS(tabId, { file: 'styles/jquery-ui-1.10.2.modified.min.css' });
    chrome.tabs.insertCSS(tabId, { file: 'styles/compact-layers-section.css' });
    var customCssCode = settings.get('customCssCode');
    if (customCssCode) chrome.tabs.insertCSS(tabId, { code: customCssCode });

    var scripts = [
        '3rd-party/jquery-1.9.1.min.js',
        '3rd-party/jquery-ui-1.10.2.min.js',
        '3rd-party/jquery.ui.touch-punch.modified.js',
        '3rd-party/underscore-min.js',
        '3rd-party/backbone-min.js',
        '3rd-party/backbone.localStorage-min.js',
        '3rd-party/d3.v3.min.js',
        '3rd-party/canvas-to-blob.min.js',
        'imagetools.js',
        'shared.js',
        'models/model.js',
        'models/panel.js',
        'models/extensionService.js',
        'models/converters/converter.js',
        'models/converters/version-converters.js',
        'views/view.js',
        'content.js'
    ];
    function executeScripts(scripts, after_executed_callback) {
        var script = scripts.shift();
        if (script) {
            chrome.tabs.executeScript(null, { file: script }, function() {
                executeScripts(scripts, after_executed_callback);
            });
        } else {
            after_executed_callback();
        }
    }
    executeScripts(scripts, function() {
        if (typeof after_injected_callback == 'function') {
            after_injected_callback();
        } else {
            activatePanel(tabId);
        }
    });
}

function check_if_PP_available_for_tab(tab) {
    var icon = 'images/icons/icon.png';
    if (tab.url.match(/^chrome:/) || tab.url.match(/^https:\/\/chrome.google.com\/webstore/)) {
        //do nothing
    } else if (tab.url.match(/file:\//)) {
        // if it's a file url we need to check if PP is allowed
        chrome.extension.isAllowedFileSchemeAccess(function(isAllowedAccess) {
            if (isAllowedAccess) {
                set_icon(icon);
                set_popup('');
            } else {
                set_popup('popups/file-scheme-access-not-allowed.html');
            }
        });
    } else {
        // assume all other urls as available
        set_icon(icon);
        set_popup('');
    }

    // usefull shortcuts
    function set_popup(popup) {
        chrome.browserAction.setPopup({ tabId: tab.id, popup: popup });
    }
    function set_icon(icon) {
        chrome.browserAction.setIcon({ path: chrome.extension.getURL(icon), tabId: tab.id });
    }
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status != 'loading') return;
    check_if_PP_available_for_tab(tab);
});

//React when a browser' action icon is clicked.
chrome.browserAction.onClicked.addListener(function(tab) {
    var pp_tab_state = PP_state[tab.id];
    if (!pp_tab_state) {
        PP_state[tab.id] = 'open';
        injectIntoTab(tab.id);
    } else {
        if (pp_tab_state == 'open') PP_state[tab.id] = 'closed';
        else if (pp_tab_state == 'closed') PP_state[tab.id] = 'open';
        togglePanel(tab.id);
    }
});

// On tab (re)load check if we need to open panel
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo) {
    var pp_tab_state = PP_state[tabId];
    if (!settings.get('rememberPanelOpenClosedState')) {
        // we need to set this to 'closed' to prevent issue with page reloading while panel is opened
        //PP_state[tabId] = 'closed';
        delete PP_state[tabId];
        return;
    } else if (!pp_tab_state || pp_tab_state == 'closed') {
        return;
    }
    // if pp_tab_state == "open" - need to open it
    if (changeInfo.status === 'complete') {
        //this means that tab was loaded
        if (!PP_state[tabId]) PP_state[tabId] = 'open';
        injectIntoTab(tabId);
    }
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.type == PP_RequestType.getTabId) {
        sendResponse({ tabId: sender.tab.id });
    } else if (request.type == PP_RequestType.ExecuteScript) {
        chrome.tabs.executeScript(sender.tab.id, request.options, function(result) {
            sendResponse(result);
        });
    } else if (request.type == PP_RequestType.OpenSettingsPage) {
        var optionsUrl = chrome.extension.getURL('fancy-settings/source/index.html');

        chrome.tabs.query({ url: optionsUrl }, function(tabs) {
            if (tabs.length) {
                chrome.tabs.update(tabs[0].id, { active: true });
            } else {
                chrome.tabs.create({ url: optionsUrl });
            }
            sendResponse();
        });
    }

    // Event listener for settings
    else if (request.type == PP_RequestType.GetExtensionOptions) {
        var settingsObj = settings.toObject();
        settingsObj.defaultLocale = chrome.runtime.getManifest().default_locale;
        settingsObj.version = chrome.runtime.getManifest().version;
        sendResponse(settingsObj);
    }

    // Event listener for tracking
    else if (request.type == PP_RequestType.TrackEvent) {
        var senderId = String(request.senderId);
        var eventType = String(request.eventType);
        var integerValue = Number(request.integerValue);
        var stringValue = request.stringValue !== undefined ? String(request.stringValue) : request.stringValue;

        trackEvent(senderId, eventType, integerValue, stringValue);

        sendResponse(true);
    }

    // Event listener for file operations
    else if (
        request.type == PP_RequestType.GETFILE ||
        request.type == PP_RequestType.ADDFILE ||
        request.type == PP_RequestType.DELETEFILE
    ) {
        PPFileManager.Init(function(responseArgs) {
            if (request.type == PP_RequestType.GETFILE) {
                // GETFILE handler

                var fileName = request.fileName;

                PPFileManager.GetFile(fileName, function(ppFile) {
                    sendPPFileResponse(ppFile, sendResponse);
                });
            } else if (request.type == PP_RequestType.ADDFILE) {
                // ADDFILE handler

                var ppFile = new PPFile();
                ppFile.ArrayBuffer = stringToBuffer(request.fileData);
                ppFile.Name = request.fileName;
                ppFile.MimeType = request.fileType;

                PPFileManager.SaveFile(ppFile, function(ppFileOut) {
                    sendPPFileResponse(ppFileOut, sendResponse);
                });
            } else if (request.type == PP_RequestType.DELETEFILE) {
                // DELETEFILE handler
                // array can be sent as request.fileName
                var fileName = request.fileName;

                PPFileManager.DeleteFiles(fileName, function() {
                    sendResponse({
                        status: 'OK'
                    });
                });
            } else sendPPFileResponse(responseArgs, sendResponse);
        });
    }

    //Event save closed notification
    else if (request.type == PP_RequestType.SetNotifications) {
        if (!localStorage[request.keyName] || parseInt(localStorage[request.keyName]) < parseInt(request.notifyId)) {
            localStorage[request.keyName] = request.notifyId;
        }
        sendMessageToAllTabs({
            type: PP_Background_RequestType.NotificationsUpdated
        });
        sendResponse(true);
    }

    //Event get last viewed notification
    else if (request.type == PP_RequestType.GetNotifications) {
        var id = localStorage[request.keyName];
        sendResponse(id);
    } else if (request.type == PP_RequestType.GetElapsedTimeOnDomain) {
        sendResponse(timeOnSitesData);
    } else if (request.type == PP_RequestType.GetGoals) {
        sendResponse(siteGoals);
    } else if (request.type == PP_RequestType.SetGoals) {
        if(request.goals && (siteGoals === undefined || siteGoals.timeStamp === undefined || request.goals.timestamp > siteGoals.timestamp)) {
            Object.assign(siteGoals, request.goals);
        }
    }

    return true;
});

// Sends message to PerfectPixel content script in specific tab
function sendMessageToTab(tabId, data, callback) {
    chrome.tabs.sendMessage(tabId, data, callback);
}

// Sends message to PerfectPixel content script in all tabs
function sendMessageToAllTabs(data) {
    chrome.tabs.query({ status: 'complete' }, function(tabs) {
        for (var i = 0; i < tabs.length; i++) {
            chrome.tabs.sendMessage(tabs[i].id, data);
        }
    });
}

var _trackEventsQueue = [];
function trackEvent(senderId, eventType, integerValue, stringValue, putInQueue) {
    if (senderId == 'settings' || settings.get('enableStatistics')) {
        var params = ['_trackEvent', senderId, eventType];

        if (integerValue && !isNaN(integerValue) && isFinite(integerValue)) {
            // push all values
            if (!stringValue || stringValue === undefined) {
                stringValue = 'value'; // GA don't track forth parameter without third
            }
            params.push(stringValue);
            params.push(Math.round(integerValue));
        } else if (stringValue && stringValue !== undefined) {
            // push all except integer value which is null
            params.push(stringValue);
        }

        if (putInQueue) {
            _trackEventsQueue.push(params);
        } else {
            _gaq.push(params);
        }
    }
}
setInterval(function() {
    if (_trackEventsQueue.length > 0) {
        var eventParams = _trackEventsQueue.pop();
        _gaq.push(eventParams);
    }
}, 1000);

function sendPPFileResponse(ppFile, sendResponse) {
    if (ppFile instanceof PPFile)
        sendResponse({
            status: 'OK',
            fileName: ppFile.Name,
            fileType: ppFile.MimeType,
            arrayBuffer: bufferToString(ppFile.ArrayBuffer)
        });
    else if (ppFile) {
        sendResponse({
            status: 'FAIL',
            message: ppFile.message,
            showToUser: ppFile.showToUser
        });
    } else
        sendResponse({
            status: 'FAIL'
        });
}
