/* include.js: Light and Simple dependency manager in JavaScript.
 * version: 0.1.1
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
                }
            };
        }());

    function implInclude(name, req, callback) {
        var index = 0,
            len = req.length,
            isGlobal = srcPath[name] && srcPath[name].global;

        remaining += len;

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

            if (!!srcPath[item].global) {
                if (srcPath[item].deps && srcPath[item].deps.length > 0) {
                    implInclude(item, srcPath[item].deps, function () {
                        return window[item];
                    });
                } else {
                    loadScript(item, function () {
                        loadedModules[item] = window[item];
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
    implInclude.global = function (options) {
        each(options, function (name, value) {
            if ('string' !== typeof value) {
                srcPath[name] = { path: value.path, deps: value.deps, global: true };
            } else {
                srcPath[name] = { path: value, deps: [], global: true };
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

    implInclude.VERSION = '1.0.1';

    return implInclude;
}());