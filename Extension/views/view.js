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

/**
 * PerfectPixel panel view
 */
var svg = null;
var balls = []; // global array representing balls
var offsetHeight = 0;
var offsetLeft = 0;
var color = d3.scale.category20();
var startStopFlag = null;
var lastMouseX = 0;
var lastMouseY = 0;
// I always like to handle ESC key
d3.select('body')
    .on('keydown', function () {
        if (balls.length == 0)
            return;
        console.log(d3.event);
        if (d3.event.keyCode == 27) { // if ESC key - toggle start stop
            StartStopGame();
        }
    });

function Ball(svg, x, y, id, aoa, weight) {
    this.posX = x; // cx
    this.posY = y; // cy
    this.color = color;
    this.radius = weight; // radius and weight same
    this.jumpSize = 1; // equivalent of speed default to 1
    this.svg = svg; // parent SVG
    this.id = id; // id of ball
    this.aoa = aoa; // initial angle of attack
    this.weight = weight;

    if (!this.aoa)
        this.aoa = Math.PI / 7;
    if (!this.weight)
        this.weight = 10;
    this.radius = this.weight;

    this.data = [this.id]; // allow us to use d3.enter()

    var thisobj = this; // i like to use thisobj instead of this. this many times not reliable particularly handling evnet

    // **** aoa is used only here -- earlier I was using to next move position.
    // Now aoa and speed together is velocity 
    this.vx = Math.cos(thisobj.aoa) * thisobj.jumpSize; // velocity x
    this.vy = Math.sin(thisobj.aoa) * thisobj.jumpSize; // velocity y
    this.initialVx = this.vx;
    this.initialVy = this.vy;
    this.initialPosX = this.posX;
    this.initialPosY = this.posY;

    // when speed changes, go to initial setting
    this.GoToInitialSettings = function (newjumpSize) {
        thisobj.posX = thisobj.initialPosX;
        thisobj.posY = thisobj.initialPosY;
        thisobj.vx = Math.cos(thisobj.aoa) * newjumpSize; // velocity x
        thisobj.vy = Math.sin(thisobj.aoa) * newjumpSize; // velocity y
        thisobj.Draw();
    }

    document.addEventListener('mousemove', function (e) {
        lastMouseX = e.pageX;
        lastMouseY = e.pageY;
    });

    document.addEventListener('click', function (e) {
        if (thisobj.lastIsUnderMouse) {
            e.stopPropagation();
            e.preventDefault();
            thisobj.Remove();
            var index = balls.indexOf(thisobj);
            balls = balls.filter(function (elem, _index) {
                return index != _index;
            });
            return false;
        }
    }, true);

    this.Draw = function () {
        var svg = thisobj.svg;
        var ball = svg.selectAll('#' + thisobj.id)
            .data(thisobj.data)
            ;
        ball.enter()
            .append("circle")
            .attr({ "id": thisobj.id, 'class': 'ball bubble', 'r': thisobj.radius, 'weight': thisobj.weight })
            .style("fill", thisobj.color)
            ;
        ball
            //.transition()//.duration(50)
            .attr("cx", thisobj.posX)
            .attr("cy", thisobj.posY)
            ;
        // intersect ball is used to show collision effect - every ball has it's own intersect ball
        var intersectBall = ball.enter()
            .append('circle')
            .attr({ 'id': thisobj.id + '_intersect', 'class': 'intersectBall' });
    }

    this.Remove = function () {
        var svg = thisobj.svg;
        var ball = svg.selectAll('#' + thisobj.id)
            .data(thisobj.data)
        ball.transition()
            .duration(500)
            .attr('r', 0);
    }

    this.Move = function () {
        var svg = thisobj.svg;

        //thisobj.posX += Math.cos(thisobj.aoa) * thisobj.jumpSize;
        //thisobj.posY += Math.sin(thisobj.aoa) * thisobj.jumpSize;

        var isUnderMouse = false;
        var x = lastMouseX;
        var y = lastMouseY;
        // do what you want with x and y
        var a = x - (thisobj.posX + offsetLeft);
        var b = y - thisobj.posY;
        var c = Math.sqrt(a * a + b * b);
        if (c < thisobj.radius) {
            isUnderMouse = true;
        } else {
            isUnderMouse = false;
        }

        if (thisobj.lastIsUnderMouse != isUnderMouse) {
            if (isUnderMouse) {
                thisobj.lastVx = thisobj.vx;
                thisobj.lastVy = thisobj.vy;
                thisobj.lastWeight = thisobj.weight;
                thisobj.vx = 0;
                thisobj.vy = 0;
                thisobj.weight = 1000000;
            } else if (thisobj.lastIsUnderMouse) {
                thisobj.vx = thisobj.lastVx;
                thisobj.vy = thisobj.lastVy;
                thisobj.weight = thisobj.lastWeight;
            }
            thisobj.lastIsUnderMouse = isUnderMouse;
        }

        thisobj.posX += thisobj.vx;
        thisobj.posY += thisobj.vy;

        if (parseInt(svg.attr('width')) <= (thisobj.posX + thisobj.radius)) {
            thisobj.posX = parseInt(svg.attr('width')) - thisobj.radius - 1;
            thisobj.aoa = Math.PI - thisobj.aoa;
            thisobj.vx = -thisobj.vx;
        }

        if (thisobj.posX < thisobj.radius) {
            thisobj.posX = thisobj.radius + 1;
            thisobj.aoa = Math.PI - thisobj.aoa;
            thisobj.vx = -thisobj.vx;
        }

        if (parseInt(svg.attr('height')) < (thisobj.posY + thisobj.radius)) {
            thisobj.posY = parseInt(svg.attr('height')) - thisobj.radius - 1;
            thisobj.aoa = 2 * Math.PI - thisobj.aoa;
            thisobj.vy = -thisobj.vy;
        }

        if (thisobj.posY < thisobj.radius) {
            thisobj.posY = thisobj.radius + 1;
            thisobj.aoa = 2 * Math.PI - thisobj.aoa;
            thisobj.vy = -thisobj.vy;
        }

        // **** NOT USING AOA except during initilization. Just left this for future reference ***** 
        if (thisobj.aoa > 2 * Math.PI)
            thisobj.aoa = thisobj.aoa - 2 * Math.PI;
        if (thisobj.aoa < 0)
            thisobj.aoa = 2 * Math.PI + thisobj.aoa;

        thisobj.Draw();
    }
}

function CheckCollision(ball1, ball2) {
    var absx = Math.abs(parseFloat(ball2.posX) - parseFloat(ball1.posX));
    var absy = Math.abs(parseFloat(ball2.posY) - parseFloat(ball1.posY));

    // find distance between two balls.
    var distance = (absx * absx) + (absy * absy);
    distance = Math.sqrt(distance);
    // check if distance is less than sum of two radius - if yes, collision
    if (distance < (parseFloat(ball1.radius) + parseFloat(ball2.radius))) {
        return true;
    }
    return false;
}

//courtsey thanks to several internet sites for formulas
//detect collision, find intersecting point and set new speed+direction for each ball based on weight (weight=radius)
function ProcessCollision(ball1, ball2) {

    if (ball2 <= ball1)
        return;
    if (ball1 >= (balls.length - 1) || ball2 >= balls.length)
        return;

    ball1 = balls[ball1];
    ball2 = balls[ball2];

    if (CheckCollision(ball1, ball2)) {
        // intersection point
        var interx = ((ball1.posX * ball2.radius) + ball2.posX * ball1.radius)
            / (ball1.radius + ball2.radius);
        var intery = ((ball1.posY * ball2.radius) + ball2.posY * ball1.radius)
            / (ball1.radius + ball2.radius);

        // show collision effect for 500 miliseconds
        var intersectBall = svg.select('#' + ball1.id + '_intersect');
        intersectBall.attr({ 'cx': interx, 'cy': intery, 'r': 5, 'fill': 'black' })
            .transition()
            .duration(500)
            .attr('r', 0);

        // calculate new velocity of each ball.
        var vx1 = (ball1.vx * (ball1.weight - ball2.weight)
            + (2 * ball2.weight * ball2.vx)) / (ball1.weight + ball2.weight);
        var vy1 = (ball1.vy * (ball1.weight - ball2.weight)
            + (2 * ball2.weight * ball2.vy)) / (ball1.weight + ball2.weight);
        var vx2 = (ball2.vx * (ball2.weight - ball1.weight)
            + (2 * ball1.weight * ball1.vx)) / (ball1.weight + ball2.weight);
        var vy2 = (ball2.vy * (ball2.weight - ball1.weight)
            + (2 * ball1.weight * ball1.vy)) / (ball1.weight + ball2.weight);

        //set velocities for both balls
        ball1.vx = vx1;
        ball1.vy = vy1;
        ball2.vx = vx2;
        ball2.vy = vy2;

        //ensure one ball is not inside others. distant apart till not colliding
        while (CheckCollision(ball1, ball2)) {
            ball1.posX += ball1.vx;
            ball1.posY += ball1.vy;

            ball2.posX += ball2.vx;
            ball2.posY += ball2.vy;
        }
        ball1.Draw();
        ball2.Draw();
    }
}

function StartStopGame() {
    if (startStopFlag == null) {
        d3.timer(function () {
            for (var i = 0; i < balls.length; ++i) {
                var r = balls[i].Move();
                for (var j = i + 1; j < balls.length; ++j) {
                    ProcessCollision(i, j);
                }
            }
            if (startStopFlag == null)
                return true;
            else
                return false;
        }, 500);
        startStopFlag = 1;
        //document.getElementById('startStop').innerHTML = 'Stop';
    }
    else {
        //startStopFlag = null;
        //document.getElementById('startStop').innerHTML = 'Start';
    }
}

function OnSpeedChange() {
    var o = document.getElementById('speed');
    if (startStopFlag != null)
        startStopFlag = null; // by setting startStopFlag to null, callback of d3.timer will return true and animation will stop

    setTimeout(function () { // go to initial position set new speed (ideally should not go to initial position)
        for (var i = 0; i < balls.length; ++i) {
            var o = document.getElementById('speed');
            newjumpSize = o.options[o.selectedIndex].value;
            balls[i].GoToInitialSettings(parseInt(newjumpSize));
        }
        setTimeout(function () {
            StartStopGame();
        }, 1000);
    }, 500);
}

function OnNumberOfBallsChanged() {
    var o = document.getElementById('numberOfBalls');
    numberOfBalls = o.options[o.selectedIndex].value;
    balls = balls.slice(0, 6);

    d3.selectAll('.ball').remove();
    //keep pushing as many balls you want..
    for (var i = 6; i < numberOfBalls; ++i) {
        balls.push(new this.Ball(svg, 101, 101, 'n' + (i + 1).toString(), color(i), Math.PI / (i + 1), (i % 2) == 0 ? 10 : (10 + i)));
    }
}

var PanelView = Backbone.View.extend({
    tagName: 'div',
    className: "chromeperfectpixel-panel",
    id: "chromeperfectpixel-panel",
    fastMoveDistance: 10,
    opacityChangeDistance: 0.1,
    screenBordersElementId: 'chromeperfectpixel-window',
    panelUpdatedFirstTime: true,
    _isFrozen: false,

    events: {
        'click .chromeperfectpixel-showHideBtn': 'toggleOverlayShown',
        'click .chromeperfectpixel-min-showHideBtn': 'toggleOverlayShown',
        'click .chromeperfectpixel-lockBtn': 'toggleOverlayLocked',
        'click .chromeperfectpixel-min-lockBtn': 'toggleOverlayLocked',
        'click .chromeperfectpixel-invertcolorsBtn': 'toggleOverlayInverted',
        'click #chromeperfectpixel-origin-controls button': 'originButtonClick',
        'change .chromeperfectpixel-coords': 'changeOrigin',
        'change #chromeperfectpixel-opacity': 'changeOpacity',
        'changed #chromeperfectpixel-opacity': 'onOpacityChanged',
        'change #chromeperfectpixel-scale': 'changeScale',
        'dblclick #chromeperfectpixel-panel-header': 'panelHeaderDoubleClick',
        'click #chromeperfectpixel-header-logo': 'panelHeaderDoubleClick',
        'click #chromeperfectpixel-closeNotification': 'closeCurrentNotification'
    },

    initialize: function (options) {
        _.bindAll(this);
        PerfectPixel.bind('change', this.update);
        PerfectPixel.overlays.bind('add', this.appendOverlay);
        PerfectPixel.overlays.bind('remove', this.update);
        PerfectPixel.overlays.bind('change', this.update);
        PerfectPixel.overlays.bind('reset', this.reloadOverlays);
        PerfectPixel.notificationModel.on('change:currentNotification', this.updateNotification);

        var view = this;
        ExtensionService.sendMessage({ type: PP_RequestType.getTabId }, function (res) {
            view.model = new Panel({ id: res.tabId });
            view.model.fetch();
            view.listenTo(view.model, 'change', view.updatePanel);

            view.render();
            svg = view._initializeD3("chromeperfectpixel-window");
            this.StartStopGame();

            PerfectPixel.fetch();
            PerfectPixel.overlays.fetch();

            if (view._isMobileEnvironment()) {
                view.model.set("collapsed", true);
                view.model.set({
                    position: {
                        top: 0,
                        right: 0,
                        left: "auto"
                    }
                });
            }
        });
    },

    updatePanel: function (obj) {
        this.$el.toggleClass('hidden', obj.attributes.hidden);
        this.$el.toggleClass('vertical', obj.attributes.vertical);
        if (!this.panelUpdatedFirstTime) {
            this.$el.addClass('collapsing');
            this.$el.toggleClass('collapsed', obj.attributes.collapsed, {
                duration: 250,
                complete: $.proxy(function () {
                    this.$el.removeClass('collapsing');
                }, this)
            });
        }
        else {
            this.$el.toggleClass('collapsed', obj.attributes.collapsed);
        }

        var position = obj.attributes.position;
        this.$el.css(position);
        for (var index in position) {
            if (position[index] == 0) this.$el.addClass('attached-' + index)
        }
        this.panelUpdatedFirstTime = false;
    },

    appendOverlay: function (overlay) {
        var itemView = new OverlayItemView({
            model: overlay
        });
        $(itemView.render().el).insertBefore('#chromeperfectpixel-layers #chromeperfectpixel-layers-add-btn');
        //this.$('#chromeperfectpixel-layers').append(itemView.render().el);
        this.update();
    },

    reloadOverlays: function () {
        this.$('#chromeperfectpixel-layers').prevAll("#chromeperfectpixel-layers-add-btn").remove();
        PerfectPixel.overlays.each($.proxy(function (overlay) {
            this.appendOverlay(overlay);
        }, this));
        this.update();
    },

    upload: function (file) {
        // Only process image files.
        if (!file.type.match('image.*')) {
            alert('File must contain image');
            return;
        }

        this.$('#chromeperfectpixel-progressbar-area').show();

        var overlay = new Overlay();
        overlay.uploadFile(file, $.proxy(function () {
            this.$('#chromeperfectpixel-progressbar-area').hide();
            var uploader = this.$('#chromeperfectpixel-fileUploader');

            // Hack Clear file upload
            uploader.unbind('change');
            uploader.parent().html(uploader.parent().html());
            this._bindFileUploader();

            PerfectPixel.overlays.add(overlay);
            if (ExtOptions.NewLayerMoveToScrollPosition) overlay.set('y', $(window).scrollTop());
            overlay.save();

            if (!PerfectPixel.getCurrentOverlay() || ExtOptions.NewLayerMakeActive) {
                PerfectPixel.setCurrentOverlay(overlay);
            }
            if (ExtOptions.NewLayerShow) PerfectPixel.showOverlay();
            if (ExtOptions.NewLayerUnlock) PerfectPixel.unlockOverlay();
        }, this));
    },

    toggleOverlayShown: function (ev) {
        if ($(ev.currentTarget).is('[disabled]')) return false;
        trackEvent('overlay', PerfectPixel.get('overlayShown') ? 'hide' : 'show');
        PerfectPixel.toggleOverlayShown();
    },

    toggleOverlayLocked: function (ev) {
        if ($(ev.currentTarget).is('[disabled]')) return false;
        trackEvent('overlay', PerfectPixel.get('overlayLocked') ? 'unlock' : 'lock');
        PerfectPixel.toggleOverlayLocked();
    },

    toggleOverlayInverted: function (ev) {
        if ($(ev.currentTarget).is('[disabled]')) return false;
        trackEvent('overlay', PerfectPixel.get('overlayInverted') ? 'un-invert' : 'invert');
        PerfectPixel.toggleOverlayInverted();
    },

    originButtonClick: function (e) {
        var button = this.$(e.currentTarget);
        trackEvent("coords", button.attr('id').replace("chromeperfectpixel-", ""));
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var axis = button.data('axis');
            var offset = button.data('offset');
            if (e.shiftKey) offset *= this.fastMoveDistance;
            if (axis == "x") {
                PerfectPixel.moveCurrentOverlay({ x: overlay.get('x') - offset });
            } else if (axis == "y") {
                PerfectPixel.moveCurrentOverlay({ y: overlay.get('y') - offset });
            }
        }
    },

    changeOrigin: function (e) {
        var input = $(e.currentTarget);
        trackEvent("coords", input.attr('id').replace("chromeperfectpixel-", ""));
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var axis = input.data('axis');
            var value = parseInt(input.val());
            isNaN(value) && (value = 0);
            switch (axis) {
                case 'x':
                    var currentValue = PerfectPixel.moveCurrentOverlay({ x: value });
                    input.val(currentValue.x || '');
                    break;
                case 'y':
                    var currentValue = PerfectPixel.moveCurrentOverlay({ y: value });
                    input.val(currentValue.y || '');
                    break;
                default:
                    break;
            }
        }
    },

    changeOpacity: function (e) {
        if (this.$(e.currentTarget).is(":disabled")) { // chrome bug if version < 15.0; opacity input isn't actually disabled
            return;
        }
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var input = this.$(e.currentTarget);
            var value = input.val();
            var returnValue = PerfectPixel.changeCurrentOverlayOpacity({ opacity: Number(value).toFixed(1) });
            input.val(returnValue.opacity || 1);
        }
    },

    onOpacityChanged: function (e) {
        trackEvent("opacity", e.type, e.currentTarget.value * 100); // GA tracks only integers not floats
    },

    changeScale: function (e) {
        var input = this.$(e.currentTarget);
        var value = input.val();
        trackEvent("scale", e.type, value * 10);
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            var returnValue = PerfectPixel.scaleCurrentOverlay({ scale: Number(value).toFixed(2) });
            input.val(Number(returnValue.scale) || 1);
        }
    },

    panelHeaderDoubleClick: function (e) {
        trackEvent(this.$(e.currentTarget).attr('id').replace("chromeperfectpixel-", ""), e.type);

        this.model.toggleCollapsed();
    },

    closeCurrentNotification: function (e) {
        var myNotify = PerfectPixel.notificationModel.getCurrentNotification();
        trackEvent("notification", "close", null, myNotify.get("id"));
        PerfectPixel.notificationModel.closeCurrentNotification();
    },

    keyDown: function (e) {
        if ($(e.target).is('.title[contenteditable]')) return;
        var overlay = PerfectPixel.getCurrentOverlay();
        var isTargetInput = $(e.target).is('input');

        if (!overlay) return;

        var distance = e.shiftKey ? this.fastMoveDistance : 1;

        if (!e.metaKey && e.altKey && e.which == 83) { // Alt + s
            PerfectPixel.toggleOverlayShown();
        }
        else if (!e.metaKey && e.altKey && e.which == 67) { // Alt + c
            PerfectPixel.toggleOverlayLocked();
        }
        else if (!e.metaKey && e.altKey && e.which == 72) { // Alt + H
            this.model.toggleHidden();
        }
        else if (!e.metaKey && e.altKey && e.which == 73) { // Alt + I
            PerfectPixel.toggleOverlayInverted();
        }
        else if (ExtOptions.allowHotkeysPositionChangeWhenLocked || !PerfectPixel.isOverlayLocked()) {
            if (e.which == 37 && !isTargetInput) { // left
                PerfectPixel.moveCurrentOverlay({ x: overlay.get('x') - distance });
            }
            else if (e.which == 38 && !isTargetInput) { // up
                PerfectPixel.moveCurrentOverlay({ y: overlay.get('y') - distance });
            }
            else if (e.which == 39 && !isTargetInput) { // right
                PerfectPixel.moveCurrentOverlay({ x: overlay.get('x') + distance });
            }
            else if (e.which == 40 && !isTargetInput) { // down
                PerfectPixel.moveCurrentOverlay({ y: overlay.get('y') + distance });
            }
            else if ((e.which == 189 || e.which == 109) && !isTargetInput) { // "-"
                PerfectPixel.changeCurrentOverlayOpacity({
                    opacity: Number(Number(overlay.get('opacity')) - this.opacityChangeDistance).toFixed(1)
                });
            }
            else if ((e.which == 187 || e.which == 107) && !isTargetInput) { // "+"
                PerfectPixel.changeCurrentOverlayOpacity({
                    opacity: Number(Number(overlay.get('opacity')) + this.opacityChangeDistance).toFixed(1)
                });
            }
            else {
                return;
            }
        }
        else {
            return;
        }

        e.stopPropagation();
        e.preventDefault();
    },

    update: function () {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay && PerfectPixel.get('overlayShown')) {
            if (!this.overlayView) {
                this.overlayView = new OverlayView();
                $('body').append(this.overlayView.render().el);
            }
            this.$('.chromeperfectpixel-showHideBtn span').text(ExtensionService.getLocalizedMessage('hide'));
            this.$('.chromeperfectpixel-min-showHideBtn').text('v');
        } else {
            if (this.overlayView) {
                this.overlayView.unrender();
                delete this.overlayView;
            }
            this.$('.chromeperfectpixel-showHideBtn span').text(ExtensionService.getLocalizedMessage('show'));
            this.$('.chromeperfectpixel-min-showHideBtn').text('i');
        }

        if (this.overlayView) {
            this.overlayView.setLocked(PerfectPixel.get('overlayLocked'));
            this.overlayView.setInverted(PerfectPixel.get('overlayInverted'));
        }

        var isNoOverlays = (PerfectPixel.overlays.size() == 0);
        var min_btns = this.$('.chromeperfectpixel-min-showHideBtn,.chromeperfectpixel-min-lockBtn');
        isNoOverlays ? min_btns.attr('disabled', '') : min_btns.removeAttr('disabled');
        this.$('.chromeperfectpixel-showHideBtn').button({ disabled: isNoOverlays });
        this.$('.chromeperfectpixel-lockBtn').button({ disabled: isNoOverlays });
        this.$('.chromeperfectpixel-lockBtn span').text(
            PerfectPixel.get('overlayLocked')
                ? ExtensionService.getLocalizedMessage('unlock')
                : ExtensionService.getLocalizedMessage('lock'));
        this.$('.chromeperfectpixel-min-lockBtn').text(PerfectPixel.get('overlayLocked') ? 'l' : 'u');
        this.$('.chromeperfectpixel-invertcolorsBtn').button({ disabled: isNoOverlays });
        this.$('.chromeperfectpixel-invertcolorsBtn span').text(
            PerfectPixel.get('overlayInverted')
                ? ExtensionService.getLocalizedMessage('uninvert_colors')
                : ExtensionService.getLocalizedMessage('invert_colors'));
        this.$('#chromeperfectpixel-origin-controls button').button({ disabled: isNoOverlays });
        this.$('input').not('input[type=file]').attr('disabled', function () {
            return isNoOverlays;
        });

        if (overlay) {
            this.$('#chromeperfectpixel-coordX').val(overlay.get('x'));
            this.$('#chromeperfectpixel-coordY').val(overlay.get('y'));
            this.$('#chromeperfectpixel-opacity').val(Number(overlay.get('opacity')));
            this.$('#chromeperfectpixel-scale').val(Number(overlay.get('scale')));
        } else {
            this.$('#chromeperfectpixel-coordX').val('');
            this.$('#chromeperfectpixel-coordY').val('');
            this.$('#chromeperfectpixel-opacity').val(0.5);
            this.$('#chromeperfectpixel-scale').val(1.0);
        }
    },

    updateNotification: function () {
        var myNotify = PerfectPixel.notificationModel.getCurrentNotification(),
            box = $('#chromeperfectpixel-notification-box'),
            textDiv = $('#chromeperfectpixel-notification-text'),
            button = $('#chromeperfectpixel-closeNotification');
        if (myNotify) {
            textDiv.html(myNotify.getText());
            button.data("id", myNotify.get("id"));
            trackEvent("notification", "show", null, myNotify.get("id"));
            box.show();
        } else {
            box.hide();
        }
    },

    togglePanelShown: function () {
        $('#chromeperfectpixel-panel').toggle();
        var new_state = $('#chromeperfectpixel-panel').is(':visible') ? 'open' : 'hidden';
        ExtensionService.sendMessage({ type: PP_RequestType.PanelStateChange, state: new_state });
    },

    render: function () {
        $('body').append(this.$el).append('<div id="' + this.screenBordersElementId + '"/>');
        this.$el.css('background', 'url(' + ExtensionService.getResourceUrl('images/noise.jpg') + ')');
        this.$el.addClass(ExtensionService.getLocalizedMessage("panel_css_class"));

        //var panelHtml =
        //'<div id="drawArea" style="width:100px; height:100px; border:1px transparent gray">';

        //this.$el.append(panelHtml);

        if (this.options.state == 'collapsed') {
            $panel_body.hide().addClass('collapsed');
            $panel.css('right', (30 - $panel.width()) + 'px');
            $('#chromeperfectpixel-min-buttons').show();
        }

        this.$('#chromeperfectpixel-fakefile').bind('click', function (e) {
            trackEvent("layer", "add", PerfectPixel.overlays.size() + 1);
            $(this).parent().find('input[type=file]').click();
        });
        this.$('#chromeperfectpixel-layers-add-btn').bind('click', function (e) {
            trackEvent("layer", "add-top-btn", PerfectPixel.overlays.size() + 1);
            $('#chromeperfectpixel-fakefile').parent().find('input[type=file]').click();
        });
        this._bindFileUploader();

        // Workaround to catch single value of opacity during opacity HTML element change
        (function (el, timeout) {
            var prevVal = el.val();
            var timer, trig = function () { el.trigger("changed"); };
            setInterval(function () {
                var currentVal = el.val();
                if (currentVal != prevVal) {
                    if (timer) {
                        clearTimeout(timer);
                    }
                    timer = setTimeout(trig, timeout);
                    prevVal = currentVal;
                }
            }, timeout);
        })(this.$("#chromeperfectpixel-opacity"), 500);

        // make panel draggable
        var panelModel = this.model;
        var view = this;
        this.$el.draggable({
            handle: "#chromeperfectpixel-panel-header",
            snap: "#" + this.screenBordersElementId,
            snapMode: "inner",
            scroll: false,
            stop: function (event, ui) {
                var $window = $(window),
                    screenWidth = $window.width(),
                    screenHeight = $('#' + view.screenBordersElementId).height(),
                    $panel = $(event.target),
                    position = {
                        left: ui.position.left,
                        top: ui.position.top,
                        right: screenWidth - (ui.position.left + $panel.width()),
                        bottom: screenHeight - (ui.position.top + $panel.height())
                    },
                    outOfBoundaries = false,
                    new_params = {};

                for (var index in position) {
                    var val = position[index];
                    if (val < 0) {
                        outOfBoundaries = true;
                        position[index] = 0;
                    }
                }
                position.right == 0 ? position.left = 'auto' : position.right = 'auto';
                position.bottom == 0 ? position.top = 'auto' : position.bottom = 'auto';

                new_params.position = position;

                if (outOfBoundaries && !panelModel.get('collapsed')) {
                    new_params.collapsed = true;
                    new_params.auto_collapsed = true;
                }

                if ((position.top == 0 || position.bottom == 0) && (position.left != 0 && position.right != 0)) {
                    new_params.vertical = false;
                }
                else if ((position.left == 0 || position.right == 0) && (position.top != 0 && position.bottom != 0)) {
                    new_params.vertical = true;
                }

                if (panelModel.get('collapsed') && panelModel.get('auto_collapsed')
                    && position.top != 0 && position.right != 0 && position.bottom != 0 && position.left != 0) {
                    new_params.collapsed = false;
                    new_params.auto_collapsed = false;
                }

                panelModel.save(new_params)
            },
            start: function () {
                $("#chromeperfectpixel-panel")
                    .css({ bottom: 'auto', right: 'auto' })
                    .removeClass('attached-top attached-left attached-right attached-bottom');
            }
        });

        this._initDropzone();

        this.updatePanel(this.model);

        // Global hotkeys on
        if (ExtOptions.enableHotkeys) {
            $('body').on('keydown', this.keyDown);
        }

        this.$('button').button();
        this.update();
    },

    destroy: function () {
        //Global hotkeys off
        if (ExtOptions.enableHotkeys) {
            $('body').off('keydown', this.keyDown);
        }

        if (this.overlayView) {
            this.overlayView.unrender();
            delete this.overlayView;
        }

        this.$el.remove();
        $('#' + this.screenBordersElementId).remove();
    },

    /**
     *
     * @private
     */
    _bindFileUploader: function () {
        var self = this;
        var uploader = this.$('#chromeperfectpixel-fileUploader');
        uploader.bind('change', function () {
            self.upload(this.files[0]);
        });
    },

    _initializeD3: function (containerId) {
        var test = d3.select("#" + containerId);
        var height = test[0][0].clientHeight; //document.getElementById(containerId).clientHeight;
        var width = test[0][0].clientWidth; //document.getElementById(containerId).clientWidth;
        offsetHeight = test[0][0].offsetHeight;
        offsetLeft = test[0][0].offsetLeft;
        gContainerId = containerId;
        gCanvasId = containerId + '_canvas';
        gTopGroupId = containerId + '_topGroup';
        var svg = d3.select("#" + containerId).append("svg")
            .attr("id", gCanvasId)
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("id", gTopGroupId)
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", width)
            .attr("height", height)
            .style("fill", "none")
            //.attr("transform", "translate(" + 1 + "," + 1 + ")")
            ;

        balls.push(new Ball(svg, 201, 201, 'n3', Math.PI / 9, 45));

        /*balls.push(new Ball(svg, 51, 31, 'n2', 'green', Math.PI / 3, 20));
        balls.push(new Ball(svg, 501, 101, 'n1', 'red', Math.PI / 6));
        balls.push(new Ball(svg, 201, 201, 'n3', 'yellow', Math.PI / 9, 90));
        balls.push(new Ball(svg, 91, 31, 'n4', 'orange', Math.PI / 2, 15));
        balls.push(new Ball(svg, 201, 21, 'n5', 'pink', Math.PI + Math.PI / 4, 15));
        balls.push(new Ball(svg, 401, 41, 'n6', 'blue', Math.PI + Math.PI / 7, 25));*/

        for (var i = 0; i < balls.length; ++i) {
            balls[i].Draw();
        }
        return svg;
    },

    _initDropzone: function () {
        var self = this;
        var dropzone = this.$el;
        var decorator = this.$("#chromeperfectpixel-dropzone-decorator");

        dropzone.on('dragover', function (e) {
            e.originalEvent.dataTransfer.dropEffect = 'copy';
            e.preventDefault();
            e.stopPropagation();
            decorator.addClass('chromeperfectpixel-dropzone-decorator-hover');
        });
        dropzone.on('dragleave', function (e) {
            decorator.removeClass('chromeperfectpixel-dropzone-decorator-hover');
        });
        dropzone.on("drop", function (e) {
            e.preventDefault();
            e.stopPropagation();
            decorator.removeClass('chromeperfectpixel-dropzone-decorator-hover');

            if (e.originalEvent.dataTransfer.files.length > 0) {
                console.log("PP File or directory dropped");
                var file = e.originalEvent.dataTransfer.files[0];
                trackEvent("dropzone", e.type, "file");
                self.upload(file);
            }

            // Just for statistics for now
            /*try
            {
                var length = e.originalEvent.dataTransfer.items.length;
                for (var i = 0; i < length; i++) {
                    var entry = e.originalEvent.dataTransfer.items[i].webkitGetAsEntry();
                    if (entry && (entry.isFile || entry.isDirectory))
                    {
                        trackEvent("dropzone", e.type, entry.isFile ? "file" : "directory");
                    }
                }
            }
            catch(e) {}*/
        });

        console.log("PP Dropzone initialized");
    },

    _isMobileEnvironment: function () {
        try { document.createEvent("TouchEvent"); return true; }
        catch (e) { return false; }
    },

    isFrozen: function () {
        return this._isFrozen;
    },

    /**
     * Hide panel, disable all global events
     */
    freeze: function () {
        this.$el.hide();
        if (this.overlayView) {
            this.overlayView.freeze();
        }
        if (ExtOptions.enableHotkeys) {
            $('body').off('keydown', this.keyDown);
        }
        this._isFrozen = true;
    },

    /**
     * Show panel, enable all global events
     */
    unfreeze: function () {
        this.$el.show();
        if (this.overlayView) {
            this.overlayView.unfreeze();
        }
        if (ExtOptions.enableHotkeys) {
            $('body').on('keydown', this.keyDown);
        }
        this._isFrozen = false;
    }
});

/**
 * PerfectPixel panel overlay item view
 */
var OverlayItemView = Backbone.View.extend({
    tagName: 'label',
    className: 'chromeperfectpixel-layer',
    title_template: '<span class="title" contenteditable="plaintext-only"/>',
    max_title_length: 5,

    events: {
        'dblclick': 'dblClick',
        'blur .title': 'titleBlur',
        'keydown .title': 'titleKeyDown',
        'click .chromeperfectpixel-delete': 'remove',
        'click input[name="chromeperfectpixel-selectedLayer"]': 'setCurrentOverlay'
    },

    initialize: function () {
        _.bindAll(this);

        this.model.bind('change', this.render);
        this.model.bind('remove', this.unrender);
        PerfectPixel.bind('change:currentOverlayId', this.update);

        this.update();
    },

    setCurrentOverlay: function () {
        PerfectPixel.setCurrentOverlay(this.model);
    },

    update: function () {
        this.$el.toggleClass('current', PerfectPixel.isOverlayCurrent(this.model));
    },

    titleKeyDown: function (e) {
        e.stopPropagation();
        if (e.keyCode == 13) {
            $(e.target).blur();
        }
        else if ((e.keyCode >= 37 && e.keyCode <= 40) //arrows
            || e.keyCode == 8       //backspace
            || e.keyCode == 46) {   //delete
            //do nothing
        }
        else if (e.target.innerText.length >= this.max_title_length) {
            var s = window.getSelection();
            if (s.extentOffset == s.baseOffset) return false; // when (s.extentOffset != s.baseOffset) text is selected
        }
    },
    titleBlur: function (e) {
        var $title = $(e.target);
        this.model.save({ title: $title.text() });
        if (!$title.text()) {
            $title.remove();
        }
    },

    dblClick: function () {
        if (this.$el.find('.title').size() == 0) {
            var $title = $(this.title_template).text('title').appendTo(this.$el).focus();
        }
        else {
            $title = this.$el.find('.title');
        }
        //select whole title text
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents($title[0]);
        selection.removeAllRanges();
        selection.addRange(range);
    },

    render: function () {
        if (this.$el.find('.chromeperfectpixel-delete').size() == 0) {
            var checkbox = $('<input type=radio name="chromeperfectpixel-selectedLayer" />');
            this.$el.append(checkbox);

            var deleteBtn = ($('<button class="chromeperfectpixel-delete">&#x2718;</button>'));
            deleteBtn.button(); // apply css
            this.$el.append(deleteBtn);

            this.$el.attr('title', ExtensionService.getLocalizedMessage("layer_change_title_hint"))
            var title = this.model.get('title');
            if (title) this.$el.append($(this.title_template).text(title));
        }

        this.model.image.getThumbnailUrlAsync($.proxy(function (thumbUrl) {
            thumbUrl && this.$el.css({ 'background-image': 'url(' + thumbUrl + ')' });
        }, this));

        return this;
    },

    unrender: function () {
        this.$el.remove();
    },

    remove: function () {
        var deleteLayerConfirmationMessage = ExtensionService.getLocalizedMessage('are_you_sure_you_want_to_delete_layer');
        trackEvent("layer", "delete", undefined, "attempt");
        if (!ExtOptions.enableDeleteLayerConfirmationMessage || confirm(deleteLayerConfirmationMessage)) {
            trackEvent("layer", "delete", undefined, "confirmed");
            this.model.destroy();
        } else {
            trackEvent("layer", "delete", undefined, "canceled");
        }
    }
});

/**
 * Overlay view
 */
var OverlayView = Backbone.View.extend({
    tagName: 'img',
    className: 'chromeperfectpixel-overlay',
    id: 'chromeperfectpixel-overlay_3985123731465987',
    zIndex: 2147483646,
    smartMovementStickBorder: 1,
    _wasVisibleUponFrozen: false,

    events: {
        'mousewheel': 'mousewheel'
    },

    initialize: function () {
        _.bindAll(this);
        PerfectPixel.bind('change:currentOverlayId', this.updateModel);
        this.updateModel(false);
    },

    /**
     *
     * @param [updateOverlay]
     */
    updateModel: function (updateOverlay) {
        (updateOverlay === undefined) && (updateOverlay = true);
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            this.model = overlay;
            this.model.bind('change', this.updateOverlay);

            updateOverlay && this.updateOverlay();
        }
    },

    updateOverlay: function () {
        var width = this.model.get('width') * this.model.get('scale');
        this.$el.css('width', width + 'px')
            .css('left', this.model.get('x') + 'px')
            .css('top', this.model.get('y') + 'px')
            .css('opacity', this.model.get('opacity'));
        this.model.image.getImageUrlAsync($.proxy(function (imageUrl) {
            imageUrl && this.$el.attr('src', imageUrl);
        }, this));
    },

    setLocked: function (value) {
        this.$el.css('pointer-events', value ? 'none' : 'auto');
    },

    setInverted: function (value) {
        this.$el.css({
            '-webkit-filter': value ? 'invert(100%)' : '',
            'filter': value ? 'invert(100%)' : ''
        });
    },

    mousewheel: function (e) {
        if (ExtOptions.enableMousewheelOpacity) {
            if (e.originalEvent.wheelDelta < 0) {
                this.model.save({ opacity: Number(this.model.get('opacity')) - 0.05 });
            } else {
                this.model.save({ opacity: Number(this.model.get('opacity')) + 0.05 });
            }
            e.stopPropagation();
            e.preventDefault();
        }
    },

    startDrag: function (e, ui) {
        // If focus is on PP panel input's remove it to allow arrow hotkeys work on overlay
        var focusedElem = $(getFocusedElement());
        if (focusedElem && (focusedElem.is('input#chromeperfectpixel-opacity')
            || focusedElem.is('input#chromeperfectpixel-coordX')
            || focusedElem.is('input#chromeperfectpixel-coordY'))) {
            focusedElem.blur();
        }

        // For Smart movement
        ui.helper.data('PPSmart.originalPosition', ui.position || { top: 0, left: 0 });
        ui.helper.data('PPSmart.stickBorder', null);
    },

    drag: function (e, ui) {
        var overlay = PerfectPixel.getCurrentOverlay();
        var newPosition = ui.position;

        if (overlay) {
            if (e.shiftKey === true) {
                // Smart movement
                var originalPosition = ui.helper.data('PPSmart.originalPosition');
                var deltaX = Math.abs(originalPosition.left - ui.position.left);
                var deltaY = Math.abs(originalPosition.top - ui.position.top);

                var stickBorder = ui.helper.data('PPSmart.stickBorder');
                if (stickBorder == null) {
                    // Initialize stick border
                    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
                        stickBorder = { x: this.smartMovementStickBorder, y: 0 };
                    }
                    else {
                        stickBorder = { x: 0, y: this.smartMovementStickBorder };
                    }
                    ui.helper.data('PPSmart.stickBorder', stickBorder);
                }

                //console.log("X: " + deltaX + "; stickBorderX: " + stickBorder.x + " Y: " + deltaY + "; stickBorderY: " + stickBorder.y);

                if (Math.abs(deltaX * stickBorder.x) > Math.abs(deltaY * stickBorder.y) ||
                    (Math.abs(deltaX * stickBorder.x) == Math.abs(deltaY * stickBorder.y) && stickBorder.x > stickBorder.y)) {
                    newPosition.top = originalPosition.top;
                    overlay.set({ x: ui.position.left, y: originalPosition.top });
                }
                else {
                    newPosition.left = originalPosition.left;
                    overlay.set({ x: originalPosition.left, y: ui.position.top });
                }
            }
            else {
                overlay.set({ x: ui.position.left, y: ui.position.top });
                ui.helper.data('PPSmart.stickBorder', null);
            }
        }
        ui.helper.data('PPSmart.originalPosition', newPosition);
        return newPosition;
    },

    stopDrag: function (e, ui) {
        var overlay = PerfectPixel.getCurrentOverlay();
        if (overlay) {
            PerfectPixel.moveCurrentOverlay({ x: ui.position.left, y: ui.position.top });
        }
    },

    render: function () {
        this.$el.css({
            'z-index': this.zIndex,
            'margin': 0,
            'padding': 0,
            'position': 'absolute',
            'background-color': 'transparent',
            'display': 'block',
            'cursor': 'all-scroll',
            'height': 'auto',
            'pointer-events': (PerfectPixel.get('overlayLocked')) ? 'none' : 'auto'
        });
        this.updateOverlay();

        this.$el.draggable({ drag: this.drag, stop: this.stopDrag, start: this.startDrag });

        return this;
    },

    unrender: function () {
        $(this.el).remove();
    },

    freeze: function () {
        this._wasVisibleUponFrozen = $(this.el).is(':visible');
        this.$el.hide();
    },

    unfreeze: function () {
        if (this._wasVisibleUponFrozen)
            this.$el.show();
    }
});

function getFocusedElement() {
    var el;
    if ((el = document.activeElement) && el != document.body)
        return el;
    else
        return null;
}
