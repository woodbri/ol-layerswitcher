import Control from 'ol/control/Control';
import Observable from 'ol/Observable';

var CSS_PREFIX = 'layer-switcher-';

/**
 * OpenLayers Layer Switcher Control.
 * See [the examples](./examples) for usage.
 * @constructor
 * @extends {ol.control.Control}
 * @param {Object} opt_options Control options, extends olx.control.ControlOptions adding:  
 * **`tipLabel`** `String` - the button tooltip.
 */
export default class LayerSwitcher extends Control {

    constructor(opt_options) {

        var options = opt_options || {};

        var tipLabel = options.tipLabel ?
            options.tipLabel : 'Legend';

        var element = document.createElement('div');

        super({element: element, target: options.target});

        this.mapListeners = [];

        this.hiddenClassName = 'ol-unselectable ol-control layer-switcher';
        if (LayerSwitcher.isTouchDevice_()) {
            this.hiddenClassName += ' touch';
        }
        this.shownClassName = 'shown';

        element.className = this.hiddenClassName;

        var button = document.createElement('button');
        button.setAttribute('title', tipLabel);
        element.appendChild(button);

        this.panel = document.createElement('div');
        this.panel.className = 'panel';
        element.appendChild(this.panel);
        LayerSwitcher.enableTouchScroll_(this.panel);

        var this_ = this;

        button.onmouseover = function(e) {
            this_.showPanel();
        };

        button.onclick = function(e) {
            e = e || window.event;
            this_.showPanel();
            e.preventDefault();
        };

        this_.panel.onmouseout = function(e) {
            e = e || window.event;
            if (!this_.panel.contains(e.toElement || e.relatedTarget)) {
                this_.hidePanel();
            }
        };

    }

    /**
    * Set the map instance the control is associated with.
    * @param {ol.Map} map The map instance.
    */
    setMap(map) {
        // Clean up listeners associated with the previous map
        for (var i = 0, key; i < this.mapListeners.length; i++) {
            Observable.unByKey(this.mapListeners[i]);
        }
        this.mapListeners.length = 0;
        // Wire up listeners etc. and store reference to new map
        super.setMap(map);
        if (map) {
            var this_ = this;
            this.mapListeners.push(map.on('pointerdown', function() {
                this_.hidePanel();
            }));
            this.renderPanel();
        }
    }

    /**
    * Show the layer panel.
    */
    showPanel() {
        if (!this.element.classList.contains(this.shownClassName)) {
            this.element.classList.add(this.shownClassName);
            this.renderPanel();
        }
    }

    /**
    * Hide the layer panel.
    */
    hidePanel() {
        if (this.element.classList.contains(this.shownClassName)) {
            this.element.classList.remove(this.shownClassName);
        }
    }

    /**
    * Re-draw the layer panel to represent the current state of the layers.
    */
    renderPanel() {
        LayerSwitcher.renderPanel(this.getMap(), this.panel);
    }

    /**
    * **Static** Re-draw the layer panel to represent the current state of the layers.
    * @param {ol.Map} map The OpenLayers Map instance to render layers for
    * @param {Element} panel The DOM Element into which the layer tree will be rendered
    */
    static renderPanel(map, panel) {

        LayerSwitcher.ensureTopVisibleBaseLayerShown_(map);

        while(panel.firstChild) {
            panel.removeChild(panel.firstChild);
        }

        var ul = document.createElement('ul');
        panel.appendChild(ul);
        // passing two map arguments instead of lyr as we're passing the map as the root of the layers tree
        LayerSwitcher.renderLayers_(map, map, ul);

    }

    /**
    * **Static** Ensure only the top-most base layer is visible if more than one is visible.
    * @param {ol.Map} map The map instance.
    * @private
    */
    static ensureTopVisibleBaseLayerShown_(map) {
        var lastVisibleBaseLyr;
        LayerSwitcher.forEachRecursive(map, function(l, idx, a) {
            if (l.get('type') === 'base' && l.getVisible()) {
                lastVisibleBaseLyr = l;
            }
        });
        if (lastVisibleBaseLyr) LayerSwitcher.setVisible_(map, lastVisibleBaseLyr, true);
    }

    /**
    * **Static** Toggle the visible state of a layer.
    * Takes care of hiding other layers in the same exclusive group if the layer
    * is toggle to visible.
    * @private
    * @param {ol.Map} map The map instance.
    * @param {ol.layer.Base} The layer whos visibility will be toggled.
    */
    static setVisible_(map, lyr, visible) {
        lyr.setVisible(visible);
        if (visible && lyr.get('type') === 'base') {
            // Hide all other base layers regardless of grouping
            LayerSwitcher.forEachRecursive(map, function(l, idx, a) {
                if (l != lyr && l.get('type') === 'base') {
                    l.setVisible(false);
                }
            });
        }
    }

    /**
    * **Static** Callback function to finish building the control after an ajax call
    * @private
    * @param {ol.layerGroup} with an addcontrol object
    * @param {ul} a DOM UL object to a insert the control into
    * @param {label} a DOM LABEL object belonging to the control
    * @param {sel} a DOM SELECT object that OPTIONs will get added to
    * @param {array|object} to build the SELECT OPTIONs out of
    * @param {function} a callback to complete the work
    */
    static buildControlCallback_(lyr, ul, label, sel, options, callback) {
        var ctrl = lyr.get('addcontrol');
        if (Array.isArray(options)) {
            var options_str = '';
            var selected = '';
            options.forEach( (item) => {
                let selected = (localStorage[ctrl.id] === item) ?  'selected' : '';
                options_str += '<option value="' + item + '" ' + selected + '>' + item + '</option>';
            });
            sel.innerHTML = options_str;
        }
        else if (typeof options == 'object') {
            for (let [key,val] of Object.entries(options)) {
                let selected = (localStorage[ctrl.id] === key) ? 'selected' : '';
                options_str += '<option value="' + item + '" ' + selected + '>' + item + '</option>';
            }
        }
        else {
           // might add support for inserting an options string otherwise ignore or throw error here
        }
        if (ctrl.change) {
            var lyrs = lyr.getLayers().getArray().slice();
            sel.onchange = ctrl.change.bind(lyrs, ctrl.id);
        }
        var li = document.createElement('li');
        li.appendChild(label);
        li.appendChild(sel);

        // make it the first in li in the ul
        ul.insertBefore(li, ul.firstChild);

        callback();
    }


    /**
    * **Static** Build a control to be inserted into panel
    * @private
    * @param {object} ctrl an addcontrol object from LayerSwitcher
    */
    static buildControl2_(lyr, ul, callback) {
        var ctrl = lyr.get('addcontrol');
        if (ctrl.type == 'select' && ctrl.id) {
            var label = document.createElement('label');
            label.innerHTML = ctrl.title + ' ';

            var sel = document.createElement('select');
            sel.id = ctrl.id;
            label.setAttribute('for', ctrl.id);

            if (typeof ctrl.options === "function") {
                $.ajax({
                    type: 'GET',
                    dataType: 'json',
                    contentType: 'text/plain',
                    xhrFields: {
                        withCredentials: false
                    },
                    url: ctrl.url,
                    success: function (data) {
                        alert('back');
                        LayerSwitcher.buildControlCallback_(lyr, ul, label, sel, data, callback);
                    }
                })
                .fail(function(jqHXR, textStatus, errorThrown) {
                    console.log('LayerSwitcher.buildControl2_ ajax request failed: ' + textStatus);
                });
            }
            else {
                LayerSwitcher.buildControlCallback_(lyr, ul, label, sel, ctrl.options, callback);
            }
        }
        // else if (ctrl.type == '...') to extend supported controls
    }

    static buildControl_(lyr, ctrl) {
        if (ctrl.type == 'select' && ctrl.id) {
            var label = document.createElement('label');
            label.innerHTML = ctrl.title + ' ';

            var sel = document.createElement('select');
            sel.id = ctrl.id;
            label.setAttribute('for', ctrl.id);

            if (ctrl.options) {
                var options_str = '';
                var selected = '';
                ctrl.options.forEach( (item) => {
                    let selected = (localStorage[ctrl.id] === item) ?  'selected' : '';
                    options_str += '<option value="' + item + '" ' + selected + '>' + item + '</option>';
                });
                sel.innerHTML = options_str;
            }
            if (ctrl.change) {
                var lyrs = lyr.getLayers().getArray().slice();
                sel.onchange = ctrl.change.bind(lyrs, ctrl.id);
            }
            var li = document.createElement('li');
            li.appendChild(label);
            li.appendChild(sel);

            return li;
        }
        // Add other input controls here if needed with appropriate else if clauses
        else {
            return null;
        }
    }

    /**
    * **Static** Render all layers that are children of a group.
    * @private
    * @param {ol.Map} map The map instance.
    * @param {ol.layer.Base} lyr Layer to be rendered (should have a title property).
    * @param {Number} idx Position in parent group list.
    */
    static renderLayer_(map, lyr, idx) {

        var li = document.createElement('li');

        var lyrTitle = lyr.get('title');
        var lyrId = LayerSwitcher.uuid();

        var label = document.createElement('label');

        if (lyr.getLayers && !lyr.get('combine')) {

            li.className = 'group';

            // Group folding
            if (lyr.get('fold')) {
              li.classList.add(CSS_PREFIX + 'fold');
              li.classList.add(CSS_PREFIX + lyr.get('fold'));
              label.onclick = function (e) {
                LayerSwitcher.toggleFold_(lyr, li);
              };
            }

            label.innerHTML = lyrTitle;
            li.appendChild(label);

            // add child layers
            var ul = document.createElement('ul');
            li.appendChild(ul);

            // Add a control
            if (lyr.get('addcontrol')) {
                LayerSwitcher.buildControl2_(lyr, ul, function() {
                    LayerSwitcher.renderLayers_(map, lyr, ul);
                });
            }

/*
                var ctrl = LayerSwitcher.buildControl_(lyr, lyr.get('addcontrol'));
                if (ctrl) {
                    ul.appendChild(ctrl);
                }
            }

            LayerSwitcher.renderLayers_(map, lyr, ul);
*/
        } else {

            li.className = 'layer';
            var input = document.createElement('input');
            if (lyr.get('type') === 'base') {
                input.type = 'radio';
                input.name = 'base';
            } else {
                input.type = 'checkbox';
            }
            input.id = lyrId;
            input.checked = lyr.get('visible');
            input.onchange = function(e) {
                LayerSwitcher.setVisible_(map, lyr, e.target.checked);
            };
            li.appendChild(input);

            label.htmlFor = lyrId;
            label.innerHTML = lyrTitle;

            var rsl = map.getView().getResolution();
            if (rsl > lyr.getMaxResolution() || rsl < lyr.getMinResolution()){
                label.className += ' disabled';
            }

            li.appendChild(label);

        }

        return li;

    }

    /**
    * **Static** Render all layers that are children of a group.
    * @private
    * @param {ol.Map} map The map instance.
    * @param {ol.layer.Group} lyr Group layer whos children will be rendered.
    * @param {Element} elm DOM element that children will be appended to.
    */
    static renderLayers_(map, lyr, elm) {
        var lyrs = lyr.getLayers().getArray().slice().reverse();
        for (var i = 0, l; i < lyrs.length; i++) {
            l = lyrs[i];
            if (l.get('title')) {
                elm.appendChild(LayerSwitcher.renderLayer_(map, l, i));
            }
        }
    }

    /**
    * **Static** Call the supplied function for each layer in the passed layer group
    * recursing nested groups.
    * @param {ol.layer.Group} lyr The layer group to start iterating from.
    * @param {Function} fn Callback which will be called for each `ol.layer.Base`
    * found under `lyr`. The signature for `fn` is the same as `ol.Collection#forEach`
    */
    static forEachRecursive(lyr, fn) {
        lyr.getLayers().forEach(function(lyr, idx, a) {
            fn(lyr, idx, a);
            if (lyr.getLayers) {
                LayerSwitcher.forEachRecursive(lyr, fn);
            }
        });
    }

    /**
    * **Static** Generate a UUID  
    * Adapted from http://stackoverflow.com/a/2117523/526860
    * @returns {String} UUID
    */
    static uuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    /**
    * @private
    * @desc Apply workaround to enable scrolling of overflowing content within an
    * element. Adapted from https://gist.github.com/chrismbarr/4107472
    */
    static enableTouchScroll_(elm) {
        if(LayerSwitcher.isTouchDevice_()){
            var scrollStartPos = 0;
            elm.addEventListener("touchstart", function(event) {
                scrollStartPos = this.scrollTop + event.touches[0].pageY;
            }, false);
            elm.addEventListener("touchmove", function(event) {
                this.scrollTop = scrollStartPos - event.touches[0].pageY;
            }, false);
        }
    }

    /**
    * @private
    * @desc Determine if the current browser supports touch events. Adapted from
    * https://gist.github.com/chrismbarr/4107472
    */
    static isTouchDevice_() {
        try {
            document.createEvent("TouchEvent");
            return true;
        } catch(e) {
            return false;
        }
    }

    /**
    * Fold/unfold layer group
    */
    static toggleFold_(lyr, li) {
        li.classList.remove(CSS_PREFIX + lyr.get('fold'));
        lyr.set('fold', (lyr.get('fold')==='open') ? 'close' : 'open');
        li.classList.add(CSS_PREFIX + lyr.get('fold'));
    }

}


// Expose LayerSwitcher as ol.control.LayerSwitcher if using a full build of
// OpenLayers
if (window.ol && window.ol.control) {
    window.ol.control.LayerSwitcher = LayerSwitcher;
}
