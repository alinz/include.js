include.js
==
Light and Simple dependency manager in JavaScript.
introduction
--
__include.js__ is yet another dependency manager for JavaScript. It supports _SVG_ document which has a strange way of loading the script. The strength of __include.js__ is on 2 sides. The first one is **parallel loading of scripts**. The second one is **loading scripts as you needed**.

####Parallel Loading of Scripts
The whole concepts of parallel loading is loading multiple scripts at the same time. as an example, Backbone.js has two dependencies which are jQuery and underscore. However, jQuery and underscore are neither depend on each other nor other libraries. So include will load both of them at the same time. so as a result 2 threads will be created by browser to load these two libraries. once these two libraries are loaded the Backbone.js is started to load.

####Loading Scripts as Requested
Once you start separating your code, specially in JavaScript, in multiple files, in 99% of the time the end users don't need to load the entire JavaScript files in order to see your app. As the user go through the app, the app request more scripts to be loaded. In this way you save two important things, __Bandwidth__ & __Render Time__.

usage
--
In order to use the __include.js__ you just have to include the include.js file.
```html
<script type="text/javascript" src="include.js"></script>
<script type="text/javascript">
    include('main', [], function() {
        console.log('Hello World!');
    });
</script>
```
There is only one function, `include`. `include` is loading dependecies, create modules and more.

There are some class methods and variables which you need to know.

###include.root###
include.root defines the root path of all the modules. the default is empty string.
```html
<script type="text/javascript" src="include.js"></script>
<script type="text/javascript">
    include.root = 'js/';
    include('main', [], function() {
        console.log('Hello World!');
    });
</script>   
```
###include.cache###
include.cache is adding extra query string to url just to trick the browser to reload the script. Default value is `true`.
```html
<script type="text/javascript" src="include.js"></script>
<script type="text/javascript">
    include.cache = false;
    include('main', [], function() {
        console.log('Hello World!');
    });
</script>   
```
####include.autoRemove####
include.autoRemove is used to remove the script tag once your script is loaded. Default value is `false`.
```html
<script type="text/javascript" src="include.js"></script>
<script type="text/javascript">
    include.autoRemove = true;
    include('main', [], function() {
        console.log('Hello World!');
    });
</script>   
```
####include.xlink####
When working with SVG documents, loading script is not the usual way. include.js has a built in system to take care of that. Default value is false. Make sure `autoRemove` is `false` if you are using `xlink`.
```html
<script type="text/javascript" xlink:href="include.js"></script>
<script type="text/javascript">
    include.xlink= true;
    include('main', [], function() {
        console.log('Hello World!');
    });
</script>   
```
####include.path([name, options], [path])####
`path` is used to locate dependencies of each module. It must be used before defining the module if the module is depending on other modules. `path` is a function which accepts 2 function signatures.

You can either define each module one at the time,
```js    
include.root = 'js/';
include.path('Module1', 'mymodule/module1');
include.path('Module2', 'mymodule/module2');
    
include('Module3', ['Module1', 'Module2'], function(Module1, Module2) {
    ...
});
```
or defining all of them at the same time
```js
include.root = 'js/';
include.path({
    'Module1': 'mymodule/module1',
    'Module2': 'mymodule/module2'
});
    
include('Module3', ['Module1', 'Module2'], function(Module1, Module2) {
    ...
});
```   
as you can see `.js` doesn't require. The `include.js` library will append `.js` to your path. So behind the scene, `include.js` assembles the information about each modules. for example the `Module1` path is `js/mymodule/module1.js`.

####include.global(options)####
global is special function which designed to load frameworks like `jQuery`, `underscore.js`, `Backbone.js` or any frameworks or modules which are not using include.js as a primary way of defining the module. if you find/know a framework which uses `window` object to register itself as a global variable,then you need to use the `global` function to load it with include. Since the include has no clue of finding dependencies of each module, it is a user responsibility to let the include.js know.

for example we want to load Backbone.js. let's just assume that backbone.js, jquery.js and underscore.js are store the following path `js/vendor/`.
```js
include.root = 'js/';
include.global({
    'jQuery': 'vendor/jquery',
    '_': 'vendor/underscore',
    'Backbone': {
        path: 'vendor/backbone',
        deps: ['jQuery', '_']
    }
});

include('Module4', ['Backbone'], function(Backbone) {
    ...
});
```
as you may notice, the name of each framework must be the same as register object in window object. for example, jquery register itself to window object as `jQuery`. so if you type `window['jQuery`]` it means the same name as `$`. it is similar to `underscore` as well. underscore register itself to `window` object as `_`.

####include(name, dependencies, function)####
This function is the heart of `include.js` library. It defines the modules by a given name, dependencies and a function to execute. <br/>__REMEMBER__ to return an something since it assign to name of your module. for example

in module1 file which located in `js/mymodule/module1.js` we are going to define a module.
```js
include('Module1', [], function() {
    var myMessage = 'Hello ';
        
    return {
        message: myMessage
    };
});
```
and module2 file depends on module1 as follow
```js
include.path('Module1', 'mymodule/module1');
include('Module2', ['Module1'], function(Module1) {
    return {
        message: Module1.mesage + 'World!'
    };
});
```

Finally we right a entry point to our app.
```html
<script type="text/javascript" src="include.js"></script>
<script type="text/javascript">
    include.root = 'js/';
    include.path('Module2', 'mymodule/module2');
    include('myapp', ['Module2'], function(Module2) {
        console.log(Module2.message);
    });
</script>
```

New feature added as of `version 1.0.1`
this feature is a fucntion `include.status` which tells the progress of loading the files. once a module being loaded this function will be called.
There is only one argument `options` which has the following properties:

`filename`: which show the complete path to the loading module
`name`: which indicates the name of the module
`status`: which always will be `loaded`. This property will be change later in future.
`remaining`: which indicates how many files wtill remaning to be loaded.



License
--
Copyright (c) 2013 Ali Najafizadeh

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
