/* include.js: Light and Simple dependency manager in JavaScript.
 * version: 1.1.2
 * Author Ali Najafizadeh
 * MIT Licensed.
 */
var include = (function () {
    'use strict';

    var loadedModules = {},
        srcPath = {},
        remaining = 0,
        checkSrcPath = function (name, path) {
            if (srcPath[name] && srcPath[name].path !== path) {
                throw 'Duplicate source name [' + name + ', ' + srcPath[name] + ']';
            }
        },
        asynCall = function () {
            var args = Array.prototype.slice.call(arguments, 0);
            if (args.length === 0 || !args[0]) {
                return;
            }
            setTimeout(function () {
                var fn = args.shift();
                fn.apply(null, args);
            }, 13);
        },
        /**
         * if target is an array the function callback will have the following signiture
         *     function (value, index)
         * if target is an object the function callback will have the following signiture
         *     function (name, value)
         */
            each = function (target, fn) {
            var i;
            if (target instanceof Array) {
                if (target && target.length > 0) {
                    for (i = 0; i < target.length; i += 1) {
                        fn.call(null, target[i], i);
                    }
                }
            } else {
                for (i in target) {
                    if (target.hasOwnProperty(i)) {
                        fn.call(null, i, target[i]);
                    }
                }
            }
        },
        loadScript = (function (document) {
            var doc = document.documentElement,
                loadedURLs = {};

            function prepareURL(name) {
                var root = include.root,
                    sourceUrl = srcPath[name].path || name,
                    result = false;

                sourceUrl = root ? root + sourceUrl : sourceUrl;
                if (!loadedURLs[sourceUrl]) {
                    loadedURLs[sourceUrl] = true;
                    sourceUrl += '.js';
                    sourceUrl += (include.cache === false) ? '?' + new Date().getTime() : '';
                    result = sourceUrl;
                }
                return result;
            }

            function removeScriptTag(elem) {
                if (elem) {
                    elem.onreadystatechange = null;
                    elem.onload = null;
                    doc.removeChild(elem);
                    elem = null;
                }
            }

            function callProgressStatus(filename, name, status) {
                if('function' === typeof include.status) {
                    if('loaded' === status) {
                        remaining--;
                    }
                    include.status({
                        filename: filename,
                        name: name,
                        status: status,
                        remaining: remaining
                    });
                }
            }

            return function (name, fn) {
                var sourceURL = prepareURL(name),
                    script;

                //callProgressStatus(sourceURL, name, 'loading');

                if (sourceURL !== false) { //it means that it has already been loaded.
                    script = document.createElement('script');
                    script.async = true;
                    script.setAttribute('type', 'text/javascript');
                    script.onreadystatechange = function () {
                        if (this.readyState === 'loaded' && include.autoRemove) {
                            removeScriptTag(script);
                        }
                        callProgressStatus(sourceURL, name, 'loaded');
                        asynCall(fn);
                    };
                    script.onload = function () {
                        if (include.autoRemove) {
                            removeScriptTag(script);
                        }
                        callProgressStatus(sourceURL, name, 'loaded');
                        asynCall(fn);
                    };
                    if (include.xlink === true) {
                        script.setAttribute("xlink:href", sourceURL);
                    } else {
                        script.src = sourceURL;
                    }
                    doc.appendChild(script);
                }
            };
        }(document)),
        Notify = (function () {
            var events = {};
            return {
                on: function (event, fn) {
                    if (events[event] === true) {
                        asynCall(fn);
                    } else if (!events[event]) {
                        events[event] = [];
                        events[event].push(fn);
                    } else {
                        events[event].push(fn);
                    }
                },
                trigger: function (event) {
                    var fns = events[event];
                    events[event] = true;
                    each(fns, function (item) {
                        asynCall(item);
                    });
                },
                available: function (name) {
                    return !!events[name];
                }
            };
        }());

    function implInclude(name, req, callback) {
        var index = 0,
            len = req.length,
            isGlobal = srcPath[name] && srcPath[name].isGlobal;

        //checking whether the module is being queued or already loaded.
        //before increasing remaining.
        for(var i = 0; i < req.length; i++) {
            var moduleName = req[i];
            if(!loadedModules[moduleName] && !Notify.available(moduleName)) {
                remaining++;
            }
        }

        if (!len) {
            if (isGlobal) {
                loadScript(name, function () {
                    loadedModules[name] = callback();
                    Notify.trigger(name);
                });
            } else {
                loadedModules[name] = callback();
                Notify.trigger(name);
            }
            return;
        }

        function countReq() {
            index += 1;
            if (index === len) {
                var reqObjects = [];
                each(req, function (item) {
                    reqObjects.push(loadedModules[item]);
                });

                if (isGlobal) {
                    loadScript(name, function () {
                        loadedModules[name] = callback.apply(null, reqObjects);
                        Notify.trigger(name);
                    });
                } else {
                    loadedModules[name] = callback.apply(null, reqObjects);
                    Notify.trigger(name);
                }
            }
        }

        each(req, function (item) {
            Notify.on(item, countReq);
            var obj = srcPath[item];
            if (!!obj.isGlobal) {
                var globalName = obj.global;
                if (obj.deps && obj.deps.length > 0) {
                    implInclude(item, obj.deps, function () {
                        return window[globalName];
                    });
                } else {
                    loadScript(item, function () {
                        loadedModules[item] = window[globalName];
                        Notify.trigger(item);
                    });
                }
            } else {
                loadScript(item);
            }
        });
    }

    implInclude.autoRemove = false;
    implInclude.xlink = false;

    /**
     * global class method
     * this method is responsible to load non include libraries and modules.
     * options must be an object. each key to that object represent a name of each module.
     * for example, let's try to define jQuery. by default jQuery is not include compatible.
     * what we can do is to use global class method as follow.
     *
     * include.global({
     *      'jQuery': '../jquery.js'
     * });
     *
     * since jQuery register itself to window object by the key name jQuery, the include use that ifnormation
     * to retrieve the jQuery object. HOWEVER, you might want to load jQuery mobile or jQuery UI or any type of
     * jQuery plugin. then what should we do???
     *
     * the answer is simple as eating a donut. what you need to do is to use the following code.
     *
     * include.global({
     *     'jQuery': '../jquery.js',
     *     'jQuery-UI': {
     *          path: '../jquery-ui.js',
     *          deps: ['jQuery'],
     *          global: 'jQuery'
     *     }
     * });
     *
     * so now, jQuery-UI is dependent on jQuery and the global variable is going to be the same as jQuery.
     *
     *
     * so here's one of my project which requires Backbone, jQuery and jQuery-UI.
     *
     * include.root = 'js/';
     * include.global({
     *      'jQuery': 'vendor/jquery-1.9.1.min',
     *      'jQuery-UI': {
     *          path: 'vendor/jquery-ui-1.10.1.min',
     *          deps: ['jQuery'],
     *          global: 'jQuery'
     *      },
     *      'Underscore': {
     *          path: 'vendor/underscore-1.4.4.min',
     *          global: '_'
     *      },
     *      'Backbone': {
     *          path: 'vendor/backbone-0.9.10.min',
     *          deps: ['Underscore', 'Backbone']
     *      }
     * });
     *
     * @param options { <string>: <string | { path: <string>, deps: <array>, global: <string> }> }
     */
    implInclude.global = function (options) {
        each(options, function (name, value) {
            if ('string' !== typeof value) {
                var deps = (value.deps)? value.deps : [];
                var globalName = (value.global)? value.global : name;
                srcPath[name] = { path: value.path, deps: deps, isGlobal: true, global: globalName };
            } else {
                srcPath[name] = { path: value, deps: [], isGlobal: true, global: name };
            }
        });
    };
    implInclude.path = function (name, path) {
        if ('string' !== typeof name) {
            each(name, function (name, value) {
                checkSrcPath(name, value);
                srcPath[name] = { path: value };
            });
        } else {
            checkSrcPath(name, path);
            srcPath[name] = { path: path };
        }
    };

    /**
     * status
     * this function will be called twice per file.
     * it's called once the loading of the file started and it will called once the file has been successfully loaded.
     * @param options  will contains 3 properties.
     * {
     *      "filename": <name of the file>
     *      "status": <"loading" | "loaded">,
     *      "remaining": <number of item remaining to be loaded>
     * }
     */
    implInclude.status = function (options) {};

    implInclude.VERSION = '1.1.2';

    return implInclude;
}());
