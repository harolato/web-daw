/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
// Initialize application
// Loads modules
angular.module('waw', [ 'Devices', 'Instruments', 'keyboard', 'midiHandler', 'Sequencer']).
    /*
    controller  : mainController
    description : It just sits there and provides $scope to child controllers
 */
controller('mainController',['$scope','schedulerService', function($scope, schedulerService){
    $scope.schedulerParams = schedulerService.params;
    var pad = function(n, width, z) {
        z = z || '0';
        n = n + '';
        return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
    }
    $scope.$watch("schedulerParams.currentTime", function(n){
        $scope.currentTime = pad(String(Math.round(n/60)),2) + ":" + pad(String(n).split(".")[0],2) + ":" + pad(String(Math.round(n*1000%1000)),3);
    });
}])
/*
    factory : audioCtx
    desc    : Creates global audio context which is responsible
              of node creation and audio processing
    return  : AudioContext interface
 */
.factory('audioCtx', function () {
    // Initialize variable
    var ctx = null;
    // Assign context depending browser compatibility
    var AudioContext = window.AudioContext || window.webkitAudioContext;
    // create new instance of context
    ctx = new AudioContext();
    // Assign a name for debugging
    ctx.name = "Main audio ctx";
    // return context for further use
    return ctx;
})
/*
    factory : masterGain
    desc    : All child nodes are being linked to this gain node for
              future audio filtering, compression etc.
    return  : GainNode interface
 */
.factory('masterGain', function(audioCtx){
    // create new Node
    var mGain = audioCtx.createGain();
    // set initial gain(volume) value
    // range [0,1]
    mGain.gain.value = 1;
    // Connect created node to speakers
    mGain.connect(audioCtx.destination);
    // return node
    return mGain;
})


.service('tunaEffectsService', ['audioCtx',function (audioCtx) {
    this.tuna = new Tuna(audioCtx);
}])
    /*
    service : utilitiesService
    desc    : Miscellaneous utility functions for example
              unique id generator
    return  : object of functions defined inside service
     */
.service('utilitiesService', function() {
    /*
        UniqueId
        Generates random string of digits and letters
     */
    this.uniqueId = function () {
        var idstr = String.fromCharCode( Math.floor( ( Math.random() * 25 ) + 65 ) );
        do {
            // between numbers and characters (48 is 0 and 90 is Z (42-48 = 90)
            var ascicode = Math.floor( ( Math.random() * 42 ) + 48 );
            if (ascicode<58 || ascicode>64){
                // exclude all chars between : (58) and @ (64)
                idstr+=String.fromCharCode(ascicode);
            }
        } while ( idstr.length < 32 );
        return idstr;
    }
});

/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
// Initialize Devices module
// Load instruments module
// --
angular.module('Devices', ['Instruments']).
    /*
    directive   : notesPreview
    desc        : Displays summary of notes defined inside device
                  This feature not fully implemented. Only for presentation.

     */
directive('notesPreview', ['schedulerService','$timeout',function(schedulerService, $timeout){
    return {
        restrict : "A",
        scope: true,
        link : function($scope, $element){

        },
        controller : function($scope) {
            var notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
            //console.log(notes);
            $scope.schedulerParams = schedulerService.params;
            $scope.$watch("schedulerParams.BPM", function(n){
               //console.log(n);
            });
            $scope.noteCoordinates;
            $scope.$watchGroup(["device.notes", "schedulerParams.BPM"], function(n){
                if ( $scope.device.notes ) {
                    //console.log(n);
                    var noteCoordinates = [];
                    var hiLoNotes = {
                        highest: {
                            index: -1,
                            octave: -1,
                            value: 0
                        },
                        lowest: {
                            index: 11,
                            octave: 20,
                            value: 99999
                        }
                    };
                    $scope.device.notes.forEach(function (note) {
                        var letter;
                        var octave;
                        var value;
                        if (note.length === 3) {
                            letter = note.note.substr(0, 1);
                            octave = parseInt(note.note.charAt(2));
                        } else {
                            letter = note.note.charAt(0);
                            octave = parseInt(note.note.charAt(1));
                        }
                        value = ((notes.indexOf(letter) + 1) * 10) + (1000 * octave );
                        if (
                            value > hiLoNotes.highest.value
                        ) {
                            hiLoNotes.highest.index = notes.indexOf(letter);
                            hiLoNotes.highest.octave = octave;
                            hiLoNotes.highest.value = value;
                        }
                        if (
                            hiLoNotes.lowest.value > value
                        ) {
                            hiLoNotes.lowest.index = notes.indexOf(letter);
                            hiLoNotes.lowest.octave = octave;
                            hiLoNotes.lowest.value = value;
                        }
                    });
                    var range = function () {
                        var range = 0;
                        var diff = (hiLoNotes.highest.octave - hiLoNotes.lowest.octave);
                        //console.log("Diff:",hiLoNotes);
                        for (var i = 0; i < diff; i++) {
                            range += notes.length - (hiLoNotes.lowest.index + 1);
                            if (diff <= 1) {
                                range += hiLoNotes.highest.index + 1;
                            } else {
                                range += 12
                            }
                        }
                        return range;
                    };
                    $scope.device.notes.forEach(function (note) {
                        var timings = schedulerService.calculateNoteTiming(note);
                        var letter;
                        var octave;
                        if (note.note.length === 3) {
                            letter = note.note.substr(0, 2);
                            octave = note.note.charAt(2);
                        } else {
                            letter = note.note.charAt(0);
                            octave = note.note.charAt(1);
                        }

                        //value = ((notes.indexOf(letter)+1)*10) + (1000 * octave );
                        //console.log(range(), value, letter);
                        var position = 0;
                        if (octave == hiLoNotes.lowest.octave) {
                            position += notes.indexOf(letter) + 1;
                        } else if (octave == hiLoNotes.highest.octave) {
                            position += (11 * (hiLoNotes.highest.octave - hiLoNotes.lowest.octave)) + notes.indexOf(letter) + 1
                        }
                        var x = timings.time.start * 80;
                        var y = 132 - position * (132 / range());
                        var w = (timings.time.end - timings.time.start) * 80;
                        var h = 132 / range();
                        noteCoordinates.push({
                            x: x,
                            y: y,
                            w: w,
                            h: h
                        });
                    });
                    $scope.noteCoordinates = noteCoordinates;
                }
            });
        },
        templateUrl : 'app/components/device/notes-preview.html'
    }
}]).
    /*
    directive   : toggleDeviceState
    desc        : Toggles device on/off.
    return      : Creates visual component to interact with implemented functionality
     */
directive('toggleDeviceState', ['$compile', function($compile){
    return {
        restrict : "A",
        scope : true,
        link : function ($scope, element) {
            element.on('click', function () {
                // When button is clicked it fires function defined inside parent scope
                $scope.toggleEnabled();
            });
            // Function which changes button's visual appearance depending on a state of device
            $scope.addClass = function (){
                return {
                    'fa-toggle-on' : $scope.device.enabled,
                    'fa-toggle-off' : !$scope.device.enabled
                }
            };

        },
        // Define template
        template : '<span ng-class="addClass()" class="fa"></span> On/Off'
    }
}])
/*
    directive   : toggleKeyboarInput
    desc        : Toggles on-screen keyboard's input on/of
                  also sets keyboard output to a device
    return      : Creates visual component to interact with implemented functionality
     */
.directive('toggleKeyboardInput', [function(){
    return {
        restrict : "A",
        require: '^device',
        scope : true,

        link : function ($scope, element ,attrs, controller) {
            // Assign parent device Scope to local scope
            $scope.device = controller.scope.device;
            // handle event
            element.on('click', function () {
                // handle keyboard output changes
                controller.scope.toggleNoteInput();
                // apply changes to parent Scope
                controller.scope.$apply();
            });
            // changes button visual appearance
            $scope.addClass = function (){
                return {
                    'fa-circle' : $scope.device.note_input,
                    'fa-circle-o' : !$scope.device.note_input
                }
            };
        },
        // define template
        template : '<span ng-class="addClass()" class="fa"></span> MIDI control'
    }
}])
/*
    directive   : slider
    desc        : Customized range slider which can interact with any value provided via ng-mode attribute
    return      : Displays a slider component
     */
.directive('slider', ['$timeout', function( $timeout){
    return {
        // reacts only to attributes
        restrict : "A",
        require : 'ngModel',
        scope : {
            model : "=ngModel"
        },
        link : function ($scope, $element, attrs, ngModel) {
            // If model is not defined via ng-model
            // terminate execution
            if ( !ngModel ) return;

            // wait until DOM is completely loaded
            $timeout(function(){
                //  Assing Math object to local scope
                $scope.Math = window.Math;
                // Find slider within current element
                var slider = $element[0].querySelector('.slider');
                // Find slider bar which indicates value
                var sliderValue = slider.querySelector('.value-bar');

                // Initialize model
                updateModel( (ngModel.$modelValue * 100) );
                // Initialize slider's value position
                sliderValue.style.width = parseInt($scope.value)  + '%';
                // handle event when changes are being made to model
                ngModel.$render = function() {
                    $scope.value = ngModel.$viewValue * 100;
                    sliderValue.style.width = parseInt($scope.value)  + '%';
                };
                var value;
                // handle mouse events
                angular.element(slider).on('mousedown', function (e) {
/////   TODO  Implement touch functionality
                    e.preventDefault();
                    angular.element(slider).on('mousemove', function (e) {
                        e.preventDefault();

                        $scope.value = ( e.offsetX * 100 ) / slider.offsetWidth;
                        $scope.$apply(updateModel);
                        sliderValue.style.width = $scope.value + '%';
                        angular.element(slider).on('mouseout', function () {
                            angular.element(slider).off('mousemove');
                            angular.element(slider).off('mouseout');
                        });
                    });
                    $scope.value = ( e.offsetX * 100 ) / slider.offsetWidth;
                    // Apply changes to scope
                    $scope.$apply(updateModel);
                    sliderValue.style.width = $scope.value + '%';

                    angular.element(slider).on('mouseup, touchend', function (e) {
                        angular.element(slider).off('mousemove');
                        $scope.$apply(updateModel);
                    });
                });
            },1000);
            // Update model
            function updateModel ( value ) {
                if ( !isNaN(value) ) {
                    $scope.value = value;
                } else {
                    value = $scope.value;
                }
                ngModel.$setViewValue(value/100);
            }
            // Synchronise local scope with the one define via ng-model
            $scope.$watch('model', function () {
                $scope.$eval(attrs.ngModel + ' = model');
            });
            $scope.$watch(attrs.ngModel, function(val){
                $scope.model = val;
            });
        },
        // define template
        template : '<div class="slider"><div class="value-bar">{{Math.round(value)}}%</div></div>'
    }
}])
    /*
    directive   : addNewDevice
    desc        : Creates a box with a list of available devices. When name of an instrument
                  is clicked new device gets created
    return      :
     */
.directive('addNewDevice', ['InstrumentsService','$compile','utilitiesService','$rootScope',function (InstrumentsService, $compile,utilitiesService, $rootScope) {
    return {
        restrict    : "A",
        scope       : true,
        link        : function ($scope){
            // Get a list of all available devices from InstrumentsService
            $scope.instruments = InstrumentsService.availableInstruments;
            // handle click
            $scope.addDevice = function (i) {
                // Generate unique id for our new device
                var id = utilitiesService.uniqueId();
                var last = document.querySelectorAll(".row.device");
                last = last[last.length-1];
                // compile element so device directive can process it further
                var el = $compile('<div class="device row" device identification="' + id + '" enabled="true" instrument="' + i.id + '"></div>')($scope.$new());
                // Attach newly compiled element to the end of devices list
                angular.element(last).after(el);
            }
        },
        templateUrl : "app/components/device/addNewDevice.html"
    }
}])
/*
    directive   : device
    desc        : Component responsible for handling all device related operations.
                  Change name, open/close settings box etc.
    return      : This directive has two states:
                     - default : displays initial view with few settings
                     - settings: displays full range of settings for present device

 */
.directive('device', function ($compile, devicesService, InstrumentsService, masterGain,$rootScope, schedulerService) {
    return {
        restrict : "A",
        // Assign attributes to scope
        scope : {
            instrument_name : '@instrument',
            identification : '@',
            enabled : '=',
            type : '@device',
            notes : '='
        },

        link : function ($scope, $el){
            // handle click event to remove device
            $scope.removeDevice = function () {
                // Interact with devicesService to remove device
                devicesService.removeDevice($scope.device);
                // Remove device from DOM
                $el.remove();
                // Close settings box in case it is open
                $scope.closeSettings();
            };

        },
        controller : function ( $scope) {
            var vm = $scope;
            // Create child scope for settings box
            var childScope = null;
            // handle click event for close settings box
            var settingz = false;
            $scope.closeSettings = function () {
                // Let other components ,such as effects or instruments, know that settings box is being closed
                $rootScope.$emit('closingSettings');
                // Find settings box inside
                var settings = angular.element( document.querySelector('#instrument-settings'));
                // Clear contents of a settings box
                settings.empty();
                settingz = false;
            };
            // handle click event for opening settings box

            $scope.openSettings = function(){
                settingz = true;
                // find settings box
                var settings = angular.element( document.querySelector('div#instrument-settings'));
                // Clear contents of a settings box in case there is one open
                settings.empty();
                // destroy child scope in case on has not been destroyed yet
                if ( childScope ) {
                    childScope.$destroy();
                }
                // create new scope
                childScope = $scope.$new();
                // Compile settings box so that device directive can do further execution
                var el = $compile('<div device="settings" identification="'+ $scope.device._id + '">')(childScope);
                // Attach to DOM newly compiled element
                settings.append(el);
            };

            // Initialize device object for data binding

            if ( vm.type == "" ) { // If 'type' attribute is not set
                // that means we are dealing with fresh new device

                // Create device object inside DevicesService and set created object to this scope
                vm.device = devicesService.add(vm.identification,vm);
                // Get new instance of an instrument from InstrumentsService
                // name of an instrument is defined as an attribute in device DOM element
                vm.device.instrument_instance = InstrumentsService.getInstrument(vm.instrument_name);
                // Route instrument's output to device's gain node
                vm.device.instrument_instance.output = vm.device.gainNode;
                // Assign a name of present device to instrument for debugging purposes
                vm.device.instrument_instance.devname = vm.device._id;
            } else { // Type is set, so we are dealing with settings box
                // get existing device and set it to this scope
                vm.device = devicesService.get(vm.identification);
            }

            // Initial parameters for a device
            vm.params = {
                // Volume of a device
                gain : (vm.type == "")? 0.2 : vm.device.gainNode.gain.value,
                enabled : (vm.type == "") ? vm.enabled:vm.device.enabled
            };
            // Set device state
            vm.device.enabled = vm.params.enabled;

            // Assign default device name
            vm.device.name = vm.device.instrument_instance.id + " - " + vm.device._id.substr(0,5);
            // Connect device gain node to master gain node
            vm.device.gainNode.connect(masterGain);

            // watch for volume changes
            vm.$watch('params.gain', function(val) {
                if ( !isNaN(val) ) {
                    if ( vm.device.enabled ) {
                        vm.device.gainNode.gain.value = val;
                    } else {
                        vm.device.gainNode.gain.value = 0;
                    }
                } else {
                    console.log("nan");
                }
            });

            // boolean flag which controls text field's visibility
            vm.nameChange = true;
            // Toggle name change input field
            vm.changeName = function () {
                vm.nameChange = !vm.nameChange;
            };

            // Toggle device state. Enable/Disable



            vm.toggleEnabled = function (nonDirective) {
                if (!nonDirective) vm.device.enabled = !vm.device.enabled;
                if ( !vm.device.enabled ) {
                    vm.device.gainNode.gain.value = 0;
                } else {
                    vm.device.gainNode.gain.value = vm.params.gain;
                }

                vm.$apply();
            };

            // Toggle note input. Enable/Disable
            vm.toggleNoteInput = function (nonDirective) {
                if (!nonDirective) vm.device.note_input = !vm.device.note_input;
                devicesService.toggleNoteInput(vm.device._id);
            };
            // Change class of device element depending on it's state on/off
            vm.getDeviceClass = function () {
                return {
                    'device-disabled' : !vm.device.enabled
                }
            };
            // Random number generator
            function randomNumber(min, max, incl) {
                incl = (incl) ? 1 : 0;
                return Math.floor(Math.random() * ( max - min + incl )) + min;
            }
            var instance = vm.device;
            if ( vm.notes == "1") {
                vm.device.notes = [
                    { // 1/8 G , 1st bar beginning , 1st quarter note beginning
                        target: instance,
                        start: "0.0.0",
                        end: "0.0.1",
                        note: "G2",
                        velocity: randomNumber(60, 127, true) // Velocity indicates note volume
                    },
                    {// 1/8 G
                        target: instance,
                        start: "0.0.1",
                        end: "0.0.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 E    2nd quarter note. 1/8+1/8 = 1/4
                        target: instance,
                        start: "0.1.0",
                        end: "0.1.1",
                        note: "E2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 C
                        target: instance,
                        start: "0.1.1",
                        end: "0.1.2",
                        note: "C2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 G
                        target: instance,
                        start: "0.2.0",
                        end: "0.2.1",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 G
                        target: instance,
                        start: "0.2.1",
                        end: "0.2.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 E
                        target: instance,
                        start: "0.3.0",
                        end: "0.3.1",
                        note: "E2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 C
                        target: instance,
                        start: "0.3.1",
                        end: "0.3.2",
                        note: "C2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 F   2nd bar beginning
                        target: instance,
                        start: "1.0.0",
                        end: "1.0.1",
                        note: "F2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 A
                        target: instance,
                        start: "1.0.1",
                        end: "1.0.2",
                        note: "A2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 C
                        target: instance,
                        start: "1.1.0",
                        end: "1.1.1",
                        note: "C3",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 A
                        target: instance,
                        start: "1.1.1",
                        end: "1.1.2",
                        note: "A2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/4 G
                        target: instance,
                        start: "1.2.0",
                        end: "1.2.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/4 G
                        target: instance,
                        start: "1.3.0",
                        end: "1.3.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    }];
            } else if ( vm.notes == "2" ) {
                vm.device.notes = [
                    { // 1/8 G , 1st bar beginning , 1st quarter note beginning
                        target: instance,
                        start: "0.0.0",
                        end: "0.0.1",
                        note: "G2",
                        velocity: randomNumber(60, 127, true) // Velocity indicates note volume
                    },
                    {// 1/8 G
                        target: instance,
                        start: "0.0.1",
                        end: "0.0.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 G
                        target: instance,
                        start: "0.2.0",
                        end: "0.2.1",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 G
                        target: instance,
                        start: "0.2.1",
                        end: "0.2.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/8 E
                        target: instance,
                        start: "0.3.0",
                        end: "0.3.1",
                        note: "E2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/4 G
                        target: instance,
                        start: "1.2.0",
                        end: "1.2.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    },
                    {// 1/4 G
                        target: instance,
                        start: "1.3.0",
                        end: "1.3.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    }];
            } else if ( vm.notes == "3" ) {
                vm.device.notes = [
                    { // 1/8 G , 1st bar beginning , 1st quarter note beginning
                        target: instance,
                        start: "0.0.0",
                        end: "0.0.1",
                        note: "G2",
                        velocity: randomNumber(60, 127, true) // Velocity indicates note volume
                    },
                    {// 1/8 G
                        target: instance,
                        start: "0.0.1",
                        end: "0.0.2",
                        note: "G2",
                        velocity: randomNumber(60, 127, true)
                    }];
            }
            this.scope = vm;
        },
        templateUrl : function (e, a){
                if ( a.device == "" ) {
                    return 'app/components/device/view.html';
                } else {
                    return 'app/components/device/device-settings.html'
                }
            }
        }
}).
/*
    service : devicesService
    desc    : Service responsible for device storage
    return  : Returns object containing list of devices and a set of functions to interact with that list
     */
service('devicesService',['utilitiesService','keyboardHelperService','audioCtx','midiHandlerService', function(utilitiesService, keyboardHelperService, audioCtx, midiHandlerService) {
    // Array which holds all devices
    this.list = [];

    //function randomNumber(min, max, incl) {
    //    incl = (incl) ? 1 : 0;
    //    return Math.floor(Math.random() * ( max - min + incl )) + min;
    //}

    /*
    Random note generator for sequencer debugging
     */
    //var genNotes = function ( id ) {
    //    var i;
    //    var notes = [];
    //    var letters = ["C","D","E","F","G","A","B"];
    //    for ( i = 0; i < 1000 ; i++) {
    //        var bar = randomNumber(0,50, true);
    //        var qt = randomNumber(0,3, true);
    //        var eighth = randomNumber(0,3, true);
    //        var start = bar + "." + qt + "." + eighth;
    //        var end = randomNumber(bar,bar + randomNumber(0,1), true) + "." + randomNumber(qt,3, true) + "." + randomNumber(eighth,3, true);
    //        notes.push({
    //            target  : id,
    //            start   : start,
    //            end     : end,
    //            note    : letters[randomNumber(0,6, true)] + randomNumber(3, 7),
    //            velocity: "0." + randomNumber(4,9)
    //        });
    //    }
    //    return notes;
    //}


    /*
    add new device to device array
    return : newly created device object
     */
    this.add = function (id) {

        // Gain node for individual device
        var gainNode = audioCtx.createGain();
        // Device model
        var device = {
            '_id' : id,
            'name' : null,
            // Instruments instance
            instrument_instance : null,
            enabled : true,
            note_input : (this.list.length == 0),
            notes : null,
            gainNode : gainNode ,
            // List of effects instances
            effects_chain : [],
        };
        // Assign name for gain node for debugging purposes
        gainNode.name = "device: " + device.name;
        // If there are no other devices inside list
        // Set on-screen keyboard controls to this device
        if (this.list.length == 0) {
            keyboardHelperService.setKeyboardUser(device);
        }
        // Push initial data to global device array
        this.list.push(device);
        // Return current model for controller
        return device;
    };

    /*
    Delete device from list
    return void
     */
    this.removeDevice = function (device) {
        // Disconnect from midi controller
        midiHandlerService.disconnectDevice(device);
        // find location of a device inside devices list
        var index = this.list.indexOf(device);
        // clean up
        device.instrument_instance = null;
        device.effects_chain = null;
        device.gainNode.disconnect();
        device.gainNode = null;
        // remove device from array
        this.list.splice(index, 1);
        // Deal with on screen keyboard outputs
        keyboardHelperService.setKeyboardUser(null);
    };
    // Selects a device to stream notes from keyboard
    this.toggleNoteInput = function (id) {
        var i ;
        var allDevices = this.getAll();
        for ( i = 0 ; i < allDevices.length ; i++) {
            var d = allDevices[i];
            if ( id == d._id ) {
                keyboardHelperService.setKeyboardUser(d);
            } else {
                d.note_input = false;
            }
        }
    };
    /*
    find required device in list
    return : device object
     */
    this.get = function ( id ) {
        var i ;
        var allDevices = this.getAll();
        for ( i = 0 ; i < allDevices.length ; i++) {
            if ( id === allDevices[i]._id ) {
                return allDevices[i];
            }
        }
    };
    this.getAll = function () {
        return this.list;
    }
}]).
controller('devicesController', ['utilitiesService', 'devicesService', function(utilitiesService, devicesService) {
    var vm = this;
}]);
/**
 * Created by Haroldas Latonas on 4/10/2016.
 */

/*
Effects module
desc    : responsible for creating new instances of effect classes
          Effect routing etc.
 */
angular.module('Effects', ['filterEffect', 'visualizationEffect', 'reverbEffect','chorusTunaEffect']).
    /*
factory : effectsService
desc    : Contains functionality to load an effect, performs effect audio routing
          and hold a list of available effects
 */
factory('effectsService',['filter', 'visualization', 'reverb','chorusTuna', function(f, viz, reverb,chorusTuna){
    var effectsList = [
        {
            name    : 'Filter',
            id      : 'filter',
            effect  : f
        },
        {
            name    : 'Visualization',
            id      : 'visualization',
            effect  : viz
        },
        {
            name    : 'Reverb',
            id      : 'reverb',
            effect  : reverb
        }
        ,
        {
            name    : 'Chorus - Tuna',
            id      : 'chorus',
            effect  : chorusTuna
        }
    ];
    /*
    Find desired effect
    args    : id - id of effect
    returns : reference to effect class
     */
    var find = function (id) {
        for ( var i = 0 ; i < effectsList.length ; i++ ) {
            if ( effectsList[i].id == id ) {
                return effectsList[i];
            }
        }
        return null;
    };
    return {
        // Get list of effects
        get effectsList () {
            return effectsList;
        },
        /*
        Loads effect into effects chain,performs routing and return reference to effect for view
        args    : id - id of effect
                  device - reference to device object
        return  : Reference to effect object
         */
        load : function (id, device) {
            var e = find(id);
            // Create effect object
            var effect = new e.effect();

            if ( device.effects_chain.length > 0 ) {  // Does effect chain contain any effects
                // get last effect inside effects chain
                var lastEffect = device.effects_chain[device.effects_chain.length-1];
                // Disconnect last effect from Device gain node
                lastEffect.params.output.disconnect();
                // Connect new effect to last effect's output
                effect.input = lastEffect.params.output;
            } else {// Effects chain is empty
                // Disconnect instrument from device gain node
                device.instrument_instance.params.output.disconnect();
                // Connect new effect with instrument's output
                effect.input = device.instrument_instance.params.output;
            }
            // Connect new effect with Device's gain node
            effect.output = device.gainNode ;
            // Fire effect initialization
            effect.init();
            // Add new effect into the end of effects chain
            device.effects_chain.push(effect);
            // Return reference to new effect
            return effect;
        },
        /*
        Disconnects and removes effect from effects chain
        args    : effectToDisconnect - reference to effect we want to remove
                  device - reference to Device Object
        return  : void
         */
        disconnectEffect : function ( effectToDisconnect, device ) {
            // Disconnect effect output
            effectToDisconnect.disconnect();
            // Get effect's location inside effects chain
            var index = device.effects_chain.indexOf(effectToDisconnect);
            // rewire effects
            if ( device.effects_chain.length > 1  ) {
                if ( index == 0 ) {
                    // connect effect on the right to instrument
                    device.effects_chain[1].input = device.instrument_instance.params.output;
                } else if ( index == (device.effects_chain.length-1) ) {
                    // connect effect on the left to device gain
                    device.effects_chain[device.effects_chain.length-2].output = device.gainNode;
                } else {
                    // connect left effect together with right effect
                    var leftEffect = device.effects_chain[index-1];
                    var rightEffect = device.effects_chain[index+1];
                    leftEffect.params.output.disconnect();
                    rightEffect.input = leftEffect.params.input;
                }
            } else if ( device.effects_chain.length == 1 ){
                device.instrument_instance.output = device.gainNode;
            }
            if ( index > -1 ) device.effects_chain.splice(index,1);
        }
    }
}])
    /*
    directive   : effectControl
    desc        : Dynamically compiles effect settings partial view
     */
.directive('effectControl', ['effectsService',function(effectsService){
    return {
        restrict : "A",
        scope : {
            // id of effect to compile
            effectControl : '@',
            // boolean flag
            // Are we reinitializing existing effect
            reinitialize : '=',
            // Number
            // Where effect is sitting inside effects list
            sequenceNumber : '='
        },
        link : function ( $scope, $el ) {
            if ( $scope.reinitialize ) { // Reinitializing effect
                // assign effect to local scope
                $scope.effect = $scope.$parent.device.effects_chain[$scope.sequenceNumber];
                // Fire initialization sequence for effect
                $scope.effect.init();
            } else {
                // Load new effect
                $scope.effect = effectsService.load(
                    $scope.effectControl ,
                    $scope.$parent.device
                );
            }
            // Initialize close button for effect's box
            var closeBtn = angular.element('<div class="close"><span class="fa fa-close"></div>');
            // bind click event for close button
            closeBtn.bind('click', function () {
                // when effect is close it get removed from effects chain
                effectsService.disconnectEffect($scope.effect,$scope.$parent.device);
                // Unbind click event to prevent event duplication
                closeBtn.unbind('click');
                // destroy scope
                $scope.$destroy();
                // Remove effect's DOM element
                $el.remove();
            });
            // Add close button to DOM
            $el.prepend(closeBtn);
            // Dynamically fetch effect settings partial view template
            $scope.getTemplate = function () {
                return 'app/components/effects/' + $scope.effectControl + '/view.html';
            };
        },
        template : '<div ng-include="getTemplate()"></div>'
    }
}])
/*
    directive   : addEffect
    desc        : Creates a box with a list of available effects
                  Perform effect's DOM element creation
     */
.directive('addEffect', ['$compile', 'effectsService',function($compile, effectsService){
    return {
        restrict : "A",
        scope : true,
        transclude : true,
        link : function ( $scope, $el ) {
            var childScope;
            $scope.addEffect = function (e) {
                childScope = $scope.$new();
                var es = document.querySelector('.instrument-control-wrapper .instrument-control-outer-wrapper .stack-horizontally:nth-last-child(2)');
                var block = $compile('<div class="stack-horizontally effect" effect-control="' + e.id + '"></div>')(childScope);
                angular.element(es).after(block);
            };
        },
        controller : function ($scope) {
            $scope.effectsList = effectsService.effectsList;
            $scope.instrument = $scope.device.instrument_instance;
        },
        templateUrl : 'app/components/effects/addEffectsDirective.html'
    };
}]);
/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
angular.module('Instruments',[ 'simpleSynth', 'simple_sampler', 'Effects'])
    /*
    directive   : instrumentControl
    desc        : Displays partial-view for particular instrument settings user interface
     */
.directive('instrumentControl', ['$compile','$timeout', function($compile, $timeout){
    return {
        restrict : "A",
        scope : true,
        link : function ($scope, $element) {
            // Get template depending on instrument
            if ( !$scope.device.instrument_instance.id ) return;

            $scope.getTemplate = function () {
                if (!$scope.device.instrument_instance) return;
                return 'app/components/instruments/' + $scope.device.instrument_instance.id + '/view.html'
            };
            // Look up if device contains any sound effects
            if ( $scope.device.effects_chain.length > 0 ) {
                // Wait until DOM is ready
                $timeout(function(){
                    // Flip array of effects
                    $scope.device.effects_chain.reverse();
                    // Scan through list of effects
                    $scope.device.effects_chain.forEach(function( e, i ){
                        //$el[0].querySelector('.effect-list ul li[data-id=' + e.id + ']').remove();
                        // For each effect create control user interface
                        var es = document.querySelector('.instrument-control-wrapper .instrument-control-outer-wrapper .stack-horizontally:nth-last-child(2)');
                        var block = $compile('<div class="stack-horizontally effect" effect-control="' + e.id + '" reinitialize="true" sequence-number="' + i + '"></div>')($scope);
                        angular.element(es).after(block);
                    });
                },500);
            }

        },
        controller : function ($scope) {
            // Send current instruments logic to view
            $scope.instrument = $scope.device.instrument_instance;

        },
        template : '<div class="instrument-control-outer-wrapper" ng-include="getTemplate()"></div>'
    };
}])
.controller('InstrumentsController', ['InstrumentsService', function (InstrumentsService) {
    var vm = this;
    vm.instruments = InstrumentsService;
}]).
    /*
    service :InstrumentsService
    desc    : Service holds a list of available instruments and function to get a new instance of an instrument
     */
service('InstrumentsService', [ 'simpleSynth', 'simpleSampler', function( simpleSynth, simpleSampler){

    this.availableInstruments = [
        {
            id : "simple_synth",
            name : "Simple Synthesizer",
            instrument : simpleSynth
        },
        {
            id : "simple_sampler",
            name : "Simple Sampler",
            instrument : simpleSampler
        }
    ];
    //console.log(this.availableInstruments);
    /*
        desc    : creates new instance of an instrument class
        arg     : id - String representing id of an instrument
        return  : Intrument Object

     */
    this.getInstrument = function ( id ) {
        for ( var i = 0 ; i < this.availableInstruments.length ; i++ ) {
            if ( this.availableInstruments[i].id == id ) {
                var instr = this.availableInstruments[i].instrument;
                var inst = new instr();
                return inst;
            }
        }
    };
}]);
/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
angular.module('keyboard',[])
/*
directive   : keyboard
desc        : Directive displays keyboard. When key is clicked controller sends signal to instrument to play a note.

 */
.directive('keyboard',['$compile', '$window','$rootScope','keyboardHelperService',function($compile, $window, $rootScope,keyboardHelperService){
    return {
        restrict : 'E',
        scope : {
            // Starting octave
            octave : '=',
            // number of octaves to display
            octaves : '='
        },
        link : function ($scope,element) {
            var vm = $scope;
            // Available notes
            vm.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            // Array for processed list of notes
            vm.notesGenerated = [];
            // Add n number of octaves
            for ( var  o = 0 ; o < vm.octaves ; o++ ) {
                vm.notesGenerated = vm.notesGenerated.concat(vm.notes);
            };
            // Add octave numbers
            var octaveCounter = vm.octave;
            vm.notesGenerated.forEach(function(v, i){
                vm.notesGenerated[i] += octaveCounter;
                if ( (i+1) % 12 == 0 && i != 0 ) {
                    octaveCounter++;
                }
            });
            // Colour whites and black keys
            vm.getClass = function ( note ) {
                return {
                    black : (vm.notesGenerated[note].split('#')[1]),
                    white : (!vm.notesGenerated[note].split('#')[1]),
                    key : true
                };
            };

            // Define callbacks
            vm.keyDown = function (note, freq) {
                // Find a device which is using keyboard
                var device = keyboardHelperService.getKeyboardUser();
                // Send note signal to instrument associated with that device
                device.instrument_instance.play(freq, null);
            };
            vm.keyUp = function (note, freq) {
                var device = keyboardHelperService.getKeyboardUser();
                device.instrument_instance.stop(freq);
            };

            // Define interaction events
            element.on('mousedown', function (e) {
                keyboardHelperService.mousedown(e, vm.keyDown);
            });
            element.on('mouseup', function(e){
                keyboardHelperService.mouseup(e, vm.keyUp);
            });

        },
        templateUrl : 'app/components/keyboard/view.html'
    }
}]).service('keyboardHelperService', [function(){
    return {
        // Calculate frequency of a note
        getFrequencyOfNote : function (note) {
            var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
            var key_number;
            var octave;

            if ( note.length === 3 ) {
                octave = note.charAt(2);
            } else {
                octave = note.charAt(1);
            }
            key_number = notes.indexOf( note.slice(0, -1) );

            if (key_number < 3) {
                key_number = key_number + 12 + ((octave - 1) * 12) + 1;
            } else {
                key_number = key_number + ((octave - 1) * 12) + 1;
            }

            return 440 * Math.pow(2, (key_number - 49) / 12);
        },
        keyboardUser : null,
        mousedown : function (e, callback) {
            var el = angular.element(e.target);
            var note = el.data().$scope.note;
            el.addClass("active");
            callback(note, this.getFrequencyOfNote(note));
        },
        mouseup : function (e, callback) {
            var el = angular.element(e.target);
            el.removeClass("active");
            var note = el.data().$scope.note;
            callback(note, this.getFrequencyOfNote(note));
        },
        setKeyboardUser : function (device) {
            this.keyboardUser = device;
        },
        getKeyboardUser : function () {
            return this.keyboardUser;
        }
    }
}]);

angular.module('midiHandler',[]).
    /*
    factory : requestMIDIAccess
    desc    : requests midi access from browsers
    return  : promise containing an object of midi access
     */
factory('requestMIDIAccess', ['$window', '$q',function ($window, $q) {
    var requestAccess = function () {
        var d = $q.defer();
        var p = d.promise;

        if ( $window.navigator && $window.navigator.requestMIDIAccess ) {
            $window.navigator.requestMIDIAccess().then(d.resolve, d.reject);
        } else {
            d.reject( new Error('Unable to gain access to WEB MIDI API'));
        }
        return p;
    }
    return {
        requestAccess : requestAccess
    };
}])
    /*
factory : midiHandlerService
desc    : Handles midi device connections. Keeps track of midi devices and their users(internal devices)
 */
.factory("midiHandlerService", ['$window', 'requestMIDIAccess', '$q', '$rootScope',function($window, requestMIDIAccess, $q, $rootScope){
    // Debugging
    var val = 0;
    var val1 = 0;
    var val2 = 0;
    // ---

    // List of midi devices together with their users
    var devices = [];
    // Get a list of midi devices attached to a computer
    var getIODevices = function () {
        // Get promise
        var access = requestMIDIAccess.requestAccess();
        // Initiate promise
        var inputs = [];
        var outputs = [];
        access.then(function (access){
            // If successful
            // Scan through all devices and add them to a list

            access.inputs.forEach(function ( i ) {
                inputs.push(i);
            });
            access.outputs.forEach(function( o ){
                outputs.push(o);
            });
            for ( var p = 0 ; p < inputs.length ; p++ ) {
                devices.push({
                    user : null,
                    midi : {
                        input : inputs[p],
                        output: outputs[p]
                    }
                });
            }
            service.devices = devices;
        });
    };

    var calcFreq = function (MIDINote) {
      return (440 * Math.pow(2, (MIDINote - 69) / 12))
    };

    // Callback for midi message
    var onMessage = function (e, user) {
        // Debugging
        service.val1 = e.data[1];
        service.val2 = e.data[2];
        service.val = e.data[0];
        // Key down event
        //console.log(e.data[0], e.data[1], e.data[2]);
        if ( e.data[0] == 144 && e.data[2] > 0 ) {
            // Send note signal to device
            user.instrument_instance.play(calcFreq(e.data[1]), null, e.data[2]);
        } else if ( e.data[0] == 128 || (e.data[0] == 144 && e.data[2] == 0) ) { // Key up event
            user.instrument_instance.stop(calcFreq(e.data[1]));
        }
    };
    function dec2hex(d, padding) {
        var hex = Number(d).toString(16);
        padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

        while (hex.length < padding) {
            hex = "0" + hex;
        }

        return hex;
    }
    // Connect internal device together with external midi device
    var connect = function (device, user) {
        if ( device && user ) {
            var d = findDevice(device);
            if ( d >= 0 ) {
                if ( devices[d].user ) {
                    console.log("Device is currently used by another instrument", devices[d]);
                } else {
                    // Assign device instance
                    devices[d].user = user;
                    // Attach callback to midi message event
                    devices[d].midi.input.onmidimessage = function (e) {
                        onMessage(e, user);
                    };
                }
            } else console.log("cant find dev");
        }
    };
    // Disconnect internal device from midi device
    var disconnect = function ( device ) {
        var d = findDevice(device, true);
        if ( d >= 0 ) {
            // Clear callback and user
            devices[d].user = null;
            devices[d].midi.input.onmidimessage = null;
            for (var i = 21 ; i < 109 ; i++) {
                devices[d].midi.output.send(["0x"+dec2hex(144),"0x"+dec2hex(i),0x00]);
            }
        }
    };
    // Get midi device current device is using
    var getActiveDevice = function (d) {
        var d = findDevice(d, true);
        //console.log(d);
        if ( d > -1 ){
            return devices[d];
        } else {
            return null;
        }

    };

    var findDevice = function ( device, active ) {
        var result = null;
        devices.some(function ( d ) {
            if ( !active ) {
                if ( d.midi.input.id == device.midi.input.id  ) {
                    //console.log(d.midi.id, device.midi.id);
                    result = d;
                    return true;
                }
            } else {
                if ( d.user && ( d.user._id == device._id ) ) {
                    result = d;
                    return true;
                }
            }
        });
        return devices.indexOf(result);
    };

    // public service object
    var service = {
        // Getters and setters
        get devices() {
          return devices;
        },
        set devices(a){
            devices = a;
        },
        // Debugging
        get val() {
            return val;
        } ,
        set val(a) {
            val = a;
            $rootScope.$apply();
        },
        get val1() {
            return val1;
        } ,
        set val1(a) {
            val1 = a;
            $rootScope.$apply();
        },
        get val2() {
            return val2;
        } ,
        set val2(a) {
            val2 = a;
            $rootScope.$apply();
        },
        // ----------
        getDevices : getIODevices,
        connectDevice : connect,
        disconnectDevice : disconnect,
        getActive : getActiveDevice
    };
    // Initiate device lookup
    service.getDevices();
    // return service object
    return service;
}])
    /*
    directive   : chooseMidiDevice
    desc        : create user interface component to interact with midiHandlerService
     */
.directive('chooseMidiDevice', ["midiHandlerService", function (midiHandlerService) {
 return {
     scope : true,
     restrict : "A",
     link : function ($scope, $element) {

     },
     controller : function ( $scope ) {
         $scope.m = midiHandlerService;
         $scope.devices = $scope.m.devices;
         $scope.activeDevice = $scope.m.getActive($scope.device);

         $scope.disconnect = function () {
             midiHandlerService.disconnectDevice($scope.device);
             $scope.activeDevice = $scope.m.getActive($scope.device);
         };

         $scope.connect = function () {
             midiHandlerService.connectDevice($scope.activeDevice,$scope.device);
             $scope.activeDevice = $scope.m.getActive($scope.device);
         };

     },
     templateUrl : 'app/components/midi_handler/view.html'
 }
}]);
/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
angular.module('Sequencer',['Devices', 'keyboard']).
controller('sequencerController', [function(){
    //var vm = $scope;
}])
.directive("schedulerControls", ["schedulerService","$timeout", "$window", "$rootScope",function(schedulerService, $timeout, $window, $rootScope){
    return {
        restrict: "A",
        scope: true,
        link: function ( $scope ) {
            $scope.hasFinished = false;
            $rootScope.$on("finishedTrack", function(){
                $scope.hasFinished = true;
            });
            $scope.play = function (){
                schedulerService.play();
                var seeker = document.querySelectorAll(".seeker");
                if ( $scope.params.isPlaying ) {
                    if ( $scope.hasFinished ) {
                        angular.forEach(seeker, function (e) {

                            e.style.WebkitTransition = "";
                            e.style.MozTransition = "";
                            e.style.left = "" + 0 + "px";
                        });
                        $scope.hasFinished = false;
                    }
                    $timeout(function(){
                        angular.forEach(seeker, function(e){
                            if ( $scope.hasFinished ) {
                                e.style.WebkitTransition = "";
                                e.style.MozTransition = "";
                                e.style.left = "" + 0 + "px";
                            }
                            e.style.WebkitTransition = "all " + ($scope.params.trackLength - $scope.params.currentTime) + "s linear";
                            e.style.MozTransition = "all " + ($scope.params.trackLength - $scope.params.currentTime) + "s linear";
                            e.style.left = "" + $scope.params.trackLength*80 + "px";
                        })
                    },0);

                } else {
                    angular.forEach(seeker, function(e){
                        e.style.left = $scope.params.currentTime*80 + "px";
                        e.style.WebkitTransition = "";
                        e.style.MozTransition = "";
                    })
                }
            };
        },
        controller: function ( $scope ) {
            //console.log(schedulerService);
            $rootScope.$on("BPMChanged", function (){
                //console.log("FIRE");
            });
            $scope.params = schedulerService.params;
            $scope.$watch('params.BPM', function (n){
                schedulerService.changeBPM(n);
            });
            $scope.togglePlayButton = function () {
                return {
                    'fa-play' : !$scope.params.isPlaying,
                    'fa-pause' : $scope.params.isPlaying
                }
            };

        },
        templateUrl : "app/components/sequencer/view.html"
    }
}])
.service("schedulerService", ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx','$q','$rootScope', function(devices, keyboard, $timeout, $interval, worker, ctx, $q, $rootScope){
    var params = {
        BPM         : 120,
        lookahead   : 0.01, // seconds50
        isPlaying   : false,
        currentTime : 0,
        trackLength : 0,
        gap         : 0
    };

    var interval = 10/params.BPM*1000; // 30 - eighth, 15 - sixteenth, 60 - quarter
    var beatLen = 60/params.BPM; // 60 seconds multiplied by BPM. one quarter note duration. seconds
    var tracks = null;
    var nextNoteIndex = 0;
    var allTracks = [];
    var nextNoteTime;
    var startTime = null;
    var scheduled = true;
    var pauseTime = 0;

    var changeBPM = function (BPM) {
        params.BPM = BPM;
        interval = 10/params.BPM*1000; // 30 - eighth, 15 - sixteenth, 60 - quarter
        beatLen = 60/params.BPM; // 60 seconds multiplied by BPM. one quarter note duration. seconds
        worker.interval = interval;
    };

    var getTracks = function () {
        var defered = $q.defer();
        var tmp = [];
        // Fetch all tracks
        defered.notify("about to update tracks");
        tracks = devices.getAll();
        tracks.forEach(function(device) {
            // Save to temporary array for comparison
            if ( device.notes )
            tmp = tmp.concat(device.notes);
        });
        // compare new track to current one
        var unique = tmp.concat(allTracks).filter(function() {
            var seen = {};
            return function( element ) {
                return !( element.start+element.end+element.note in seen) && (seen[element.start+element.end+element.note] = 1);
            };
        }());
        // If no changes found terminate function
        //console.log([unique.length, allTracks.length, tmp]);

        if ( unique.length == allTracks.length ) {
            defered.resolve({message : "no changes found"});
        } else {
            // otherwise update track list
            //console.log("please wait...");
            allTracks = angular.copy(tmp);

            allTracks.sort(sortNotes);
            defered.resolve({message : "Sort complete"});
        }
        return defered.promise;
    };

    var play = function (stop) {

        if ( stop ) {
            worker.stop();
            params.isPlaying = false;
            nextNoteIndex = 0;
            nextNoteTime = 0;
            params.currentTime = 0;
            params.trackLength = 0;
            startTime = 0;
            pauseTime = 0;
            $rootScope.$emit("finishedTrack");
            return;
        }

        params.isPlaying = !params.isPlaying;
        if ( params.isPlaying ) {
            var updateTracks = getTracks();
            updateTracks.then(function(res){
                //allTracks.forEach(function(note){
                //    console.log(calculateNoteTiming(note).time);
                //});
                params.trackLength = calculateNoteTiming(allTracks[allTracks.length-1]).time.end;
                worker.start();
                startTime = ctx.currentTime;
                if ( pauseTime > 0 ) {
                    startTime -= pauseTime;
                    console.log("Pause time: ", pauseTime, startTime);
                }

                nextNoteTime = calculateNoteTiming(allTracks[nextNoteIndex]).time.start;
            });
        } else {
            worker.stop();
            tracks.forEach(function (track){
                track.instrument_instance.stop(0, true);
            });

            pauseTime = ctx.currentTime - startTime;
            //console.log("Pause time: ", pauseTime, startTime);
        }
    };


    var initialize = function () {
        //console.log("inited");
        //console.log(worker);
        worker.WebWorker.onmessage = function (e) {
            if ( e.data == "tick" ) {
                schedule();
            } else {
                //console.log({"message" : e.data});
            }
        };
        worker.interval = interval;
    };

    var scheduleNote = function () {
        //var device = devices.get(note.target);
        //console.log(device);
        scheduled = false;
        var note = allTracks[nextNoteIndex];
        var schedule = {
            start : ctx.currentTime + params.gap,
            stop  : ctx.currentTime + note.time.end - note.time.start
        };
        console.log("Schedule: ", schedule);
        //console.log("Note object: " , note);
        note.target.instrument_instance.play( keyboard.getFrequencyOfNote(note.note), schedule,note.velocity);
        nextNote();
        scheduled = true;
        //console.log("scheduleNote()",nextNoteTime);

        //nextNoteIndex++;
    };

    var nextNote = function(returnNote){
        //var ct = ctx.currentTime;
        //if ( nextNoteIndex >= allTracks.length ) return false;
        //var next = calculateNoteTiming(allTracks[nextNoteIndex]);
        //if ( returnNote ){
        //    next.time.end += ct;
        //    next.time.start += ct
        //    return next;
        //}
        //
        //var lookahead = ct + lookahead;
        //if ( ( next.time.start  < lookahead) && nextNoteIndex < allTracks.length ) {
        //    console.log(true,(next.time.start+ct), lookahead, startTime);
        //    return true;
        //} else {
        //    console.log(false,(next.time.start+ct), lookahead);
        //    return false;
        //
        //}
        nextNoteIndex++;
        if ( !allTracks[nextNoteIndex] ) return;
        var nn = calculateNoteTiming(allTracks[nextNoteIndex]);
        //var pn = calculateNoteTiming(allTracks[nextNoteIndex-1]);
        nextNoteTime = nn.time.start;
        //console.log('nextNote()',nextNoteTime, nextNoteIndex, nn,pn);
    };

    var increaseTimer = function(){
        $timeout(function(){
            params.currentTime = ctx.currentTime - startTime;
        },0);
    };

    var schedule = function () {
        console.log("schedulin***************************************************");

        //var updateTracks = getTracks();
        //updateTracks.then(function (r){
        console.log(params.trackLength, params.currentTime);
        if ( params.trackLength <= params.currentTime ) {
            play(true);
            return;
        };
        increaseTimer();
        console.log("Timings: ",nextNoteTime, (params.currentTime + params.lookahead));
        while ( parseFloat(nextNoteTime) < parseFloat(params.currentTime + params.lookahead) && nextNoteIndex < allTracks.length && params.isPlaying ) {
            console.log("loopin");
            //console.log(ctx.currentTime);
            if ( scheduled ) {
                scheduleNote();
            }
            //if ( nextNoteIndex >= allTracks.length ) play(true);
        }
        //});
    };
    var sortNotes = function (a, b) {

        //var astart  = breakNoteCoordinates(a.start);
        //var bstart  = breakNoteCoordinates(b.start);
        //
        //if ( astart['bar'] > bstart['bar'] ) {
        //    return 1;
        //} else if ( astart['bar'] == bstart['bar'] ) {
        //    if ( astart['beat'] == bstart['beat'] ) {
        //        if ( astart['eighth'] == bstart['eighth'] ) {
        //            return 0;
        //        } else if ( astart['eighth'] > bstart['eighth'] ) {
        //            return 1;
        //        } else {
        //            return -1;
        //        }
        //    } else if ( astart['quarter'] > bstart['quarter'] ) {
        //        return 1;
        //    } else {
        //        return -1;
        //    }
        //} else {
        //    return -1;
        //}
        a = calculateNoteTiming(a);
        b = calculateNoteTiming(b);
        if ( a.time.start > b.time.start ) {
            return 1;
        } else if (a.time.start == b.time.start ) {
            return 0;
        } else {
            return -1;
        }
    };

    var breakNoteCoordinates = function (coords) {
        var brake = coords.split(".");
        //console.log(brake);
        return {
            bar    : parseInt(brake[0]),
            beat    : parseInt(brake[1]),
            eighth  : parseInt(brake[2])
        };
    };

    var noteLength = function ( type ) {
        //console.log(beatLen);
        switch ( type ) {
            case "bar"      : return beatLen*4; // Length of a bar (4 quarter notes)
            case "beat"  : return beatLen; // Length of a beat  (1 quarter note)
            case "eighth"   : return (beatLen/2); // Length of a eighth note ( 1/8  note)
            default: return false;
        }
    };

    var calculateNoteTiming = function (note) {
        var start = breakNoteCoordinates(note.start);
        var end = breakNoteCoordinates(note.end);
        //console.log(start,end);
        var noteStartTime =
            ( start.bar * noteLength("bar")) +
            ( start.beat * noteLength("beat") ) +
            ( start.eighth * noteLength("eighth") );
        var noteEndTime =
            ( end.bar * noteLength("bar")) +
            ( end.beat * noteLength("beat") ) +
            ( end.eighth * noteLength("eighth") );
        note.time = {
            start  : noteStartTime,
            end    : noteEndTime
        };
        return note;
    };



    initialize();

    this.play = play;
    this.calculateNoteTiming = calculateNoteTiming;
    this.changeBPM = changeBPM;
    this.params = params;
}])
.factory('sequencerService', ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx','$q','$rootScope', function(devices, keyboard, $timeout, $interval, worker, ctx, $q, $rootScope){
    var Scheduler = function () {
        var params = {
            BPM         : 50,
            lookahead   : 0.01, // seconds50
            interval    : 10/120*1000, // 30 - eighth, 15 - sixteenth, 60 - quarter
            isPlaying   : false,
            currentTime : 0,
            trackLength : 0,
            gap         : 0
        };


        var beatLen = 60/params.BPM; // 60 seconds multiplied by BPM. one quarter note duration. seconds
        var tracks = null;
        var nextNoteIndex = 0;
        var allTracks = [];
        var nextNoteTime;
        var startTime = null;
        var scheduled = true;
        var pauseTime = 0;

        var getTracks = function () {
                var defered = $q.defer();
                var tmp = [];
                // Fetch all tracks
                defered.notify("about to update tracks");
                tracks = devices.getAll();
                tracks.forEach(function(device) {
                    if (device.enabled){
                    // Save to temporary array for comparison
                        tmp = tmp.concat(device.notes);
                    }
                });
                // compare new track to current one
                var unique = tmp.concat(allTracks).filter(function() {
                    var seen = {};
                    return function( element ) {
                        return !( element.start+element.end+element.note in seen) && (seen[element.start+element.end+element.note] = 1);
                    };
                }());
                // If no changes found terminate function
                //console.log([unique.length, allTracks.length, tmp]);
    
                if ( unique.length == allTracks.length ) {
                    defered.resolve({message : "no changes found"});
                } else {
                    // otherwise update track list
                    console.log("please wait...");
                    allTracks = angular.copy(tmp);

                    allTracks.sort(sortNotes);
                    defered.resolve({message : "Sort complete"});
                }
            return defered.promise;
        };
    
        var play = function (stop) {
    
            if ( stop ) {
                worker.stop();
                params.isPlaying = false;
                nextNoteIndex = 0;
                nextNoteTime = 0;
                params.currentTime = 0;
                params.trackLength = 0;
                startTime = 0;
                pauseTime = 0;
                $rootScope.$emit("finishedTrack");
                return;
            }

            params.isPlaying = !params.isPlaying;
            if ( params.isPlaying ) {
                var updateTracks = getTracks();
                updateTracks.then(function(res){
                    //allTracks.forEach(function(note){
                    //    console.log(calculateNoteTiming(note).time);
                    //});
                    params.trackLength = calculateNoteTiming(allTracks[allTracks.length-1]).time.end;
                    worker.start();
                    startTime = ctx.currentTime;
                    if ( pauseTime > 0 ) {
                        startTime -= pauseTime;
                        //console.log("Pause time: ", pauseTime, startTime);
                    }

                    nextNoteTime = calculateNoteTiming(allTracks[nextNoteIndex]).time.start;
                });
            } else {
                worker.stop();
                tracks.forEach(function (track){
                    track.instrument_instance.stop(0, true);
                });

                pauseTime = ctx.currentTime - startTime;
                //console.log("Pause time: ", pauseTime, startTime);
            }
        };

    
        var initialize = function () {
            //console.log("inited");
            //console.log(worker);
            worker.WebWorker.onmessage = function (e) {
                if ( e.data == "tick" ) {
                    schedule();
                } else {
                    //console.log({"message" : e.data});
                }
            };
            worker.interval = params.interval;
        };
    
        var scheduleNote = function () {
            //var device = devices.get(note.target);
            //console.log(device);
            scheduled = false;
            var note = allTracks[nextNoteIndex];
            var schedule = {
                start : ctx.currentTime + params.gap,
                stop  : ctx.currentTime + note.time.end - note.time.start
            };
            console.log("Schedule: ", schedule);
            //console.log("Note object: " , note);
            note.target.instrument_instance.play( keyboard.getFrequencyOfNote(note.note), schedule,note.velocity);
            nextNote();
            scheduled = true;
            //console.log("scheduleNote()",nextNoteTime);
    
            //nextNoteIndex++;
        };
    
        var nextNote = function(returnNote){
            //var ct = ctx.currentTime;
            //if ( nextNoteIndex >= allTracks.length ) return false;
            //var next = calculateNoteTiming(allTracks[nextNoteIndex]);
            //if ( returnNote ){
            //    next.time.end += ct;
            //    next.time.start += ct
            //    return next;
            //}
            //
            //var lookahead = ct + lookahead;
            //if ( ( next.time.start  < lookahead) && nextNoteIndex < allTracks.length ) {
            //    console.log(true,(next.time.start+ct), lookahead, startTime);
            //    return true;
            //} else {
            //    console.log(false,(next.time.start+ct), lookahead);
            //    return false;
            //
            //}
            nextNoteIndex++;
            if ( !allTracks[nextNoteIndex] ) return;
            var nn = calculateNoteTiming(allTracks[nextNoteIndex]);
            //var pn = calculateNoteTiming(allTracks[nextNoteIndex-1]);
            nextNoteTime = nn.time.start;
            //console.log('nextNote()',nextNoteTime, nextNoteIndex, nn,pn);
        };
    
        var increaseTimer = function(){
            $timeout(function(){
                params.currentTime = ctx.currentTime - startTime;
            },0);
        };
    
        var schedule = function () {
            //console.log("schedulin***************************************************");
    
            //var updateTracks = getTracks();
            //updateTracks.then(function (r){
            //console.log(params.trackLength, params.currentTime);
            if ( params.trackLength <= params.currentTime ) {
                play(true);
                return;
            };
            increaseTimer();
            //console.log("Timings: ",nextNoteTime, (params.currentTime + params.lookahead));
            while ( parseFloat(nextNoteTime) < parseFloat(params.currentTime + params.lookahead) && nextNoteIndex < allTracks.length && params.isPlaying ) {
                //console.log("loopin");
                //console.log(ctx.currentTime);
                if ( scheduled ) {
                    scheduleNote();
                }
                //if ( nextNoteIndex >= allTracks.length ) play(true);
            }
            //console.log("end schedule");
            //});
        };
        var sortNotes = function (a, b) {

            //var astart  = breakNoteCoordinates(a.start);
            //var bstart  = breakNoteCoordinates(b.start);
            //
            //if ( astart['bar'] > bstart['bar'] ) {
            //    return 1;
            //} else if ( astart['bar'] == bstart['bar'] ) {
            //    if ( astart['beat'] == bstart['beat'] ) {
            //        if ( astart['eighth'] == bstart['eighth'] ) {
            //            return 0;
            //        } else if ( astart['eighth'] > bstart['eighth'] ) {
            //            return 1;
            //        } else {
            //            return -1;
            //        }
            //    } else if ( astart['quarter'] > bstart['quarter'] ) {
            //        return 1;
            //    } else {
            //        return -1;
            //    }
            //} else {
            //    return -1;
            //}
            a = calculateNoteTiming(a);
            b = calculateNoteTiming(b);
            if ( a.time.start > b.time.start ) {
                return 1;
            } else if (a.time.start == b.time.start ) {
                return 0;
            } else {
                return -1;
            }
        };

        var breakNoteCoordinates = function (coords) {
            var brake = coords.split(".");
            //console.log(brake);
            return {
                bar    : parseInt(brake[0]),
                beat    : parseInt(brake[1]),
                eighth  : parseInt(brake[2])
            };
        };

        var noteLength = function ( type ) {
            switch ( type ) {
                case "bar"      : return beatLen*4; // Length of a bar (4 quarter notes)
                case "beat"  : return beatLen; // Length of a beat  (1 quarter note)
                case "eighth"   : return (beatLen/2); // Length of a eighth note ( 1/8  note)
                default: return false;
            }
        };

        var calculateNoteTiming = function (note) {
            var start = breakNoteCoordinates(note.start);
            var end = breakNoteCoordinates(note.end);
        //console.log(start,end);
            var noteStartTime =
                ( start.bar * noteLength("bar")) +
                ( start.beat * noteLength("beat") ) +
                ( start.eighth * noteLength("eighth") );
            var noteEndTime =
                ( end.bar * noteLength("bar")) +
                ( end.beat * noteLength("beat") ) +
                ( end.eighth * noteLength("eighth") );
            note.time = {
                start  : noteStartTime,
                end    : noteEndTime
            };
            return note;
        };

        initialize();

        return {
            get params() {
                return params;
            },
            get interval(){
              return params.interval;
            },
            get BPM () {
              return params.BPM;
            },
            set BPM ( a ) {
                params.BPM = a;
            },
            play : function(){
                $timeout(function(){
                    play();
                },0);
            }
        };
    };
    return new Scheduler();
    //var play = function () {
    //
    //    devices.forEach(function(device){
    //        var device = device;
    //        if ( device.enabled ) {
    //            //device.notes.sort(sortNotes);
    //            //console.log(device.notes);
    //            allTracks = allTracks.concat(device.notes);
    //
    //            //console.log({
    //            //    "Starts at:" : calculateNoteTiming(device.notes[0]),
    //            //    "Ends at:" : calculateNoteTiming(device.notes[device.notes.length-1])
    //            //});
    //
    //            //device.notes.forEach(function(note){
    //            //
    //            //    var timing = calculateNoteTiming(note);
    //            //
    //            //    playOsc(timing.start, timing.end, note.note);
    //            //    //console.log([
    //            //    //    {
    //            //    //        start   : timing.start,
    //            //    //        end     : timing.end,
    //            //    //        note    : note.note
    //            //    //    }
    //            //    //]);
    //            //});
    //        }
    //    });
    //
    //
    //    allTracks.sort(sortNotes);
    //    allTracks.forEach(function( note ){
    //        var timing = calculateNoteTiming(note);
    //        //console.log(note.target);
    //        note.target.instrument_instance.play(timing.start, timing.end,note.velocity, keyboard.getFrequencyOfNote(note.note));
    //    });
    //    //console.log(allTracks);
    //
    //};
    //stop = function (){
    //    var ap = AudioParam.cancelScheduledValues(ctx.currentTime);
    //}

}])
.service('sequencerWorkerService', [function () {
    function SequencerWorker () {
        var WebWorker = new Worker('app/components/sequencer/sequencerWorker.js');
        var stop = function () {
            WebWorker.postMessage("stop");
        }
        var start = function () {
            WebWorker.postMessage("start");
        }
        var changeInterval = function ( lookaheadTime ) {
            WebWorker.postMessage({"interval" : lookaheadTime});
        }
        return {
            get WebWorker () {
                return WebWorker;
            },
            set interval (a) {
                changeInterval(a);
            },
            start : start,
            stop  : stop
        }
    }
    return new SequencerWorker();
}])
.controller('schedulerController',['sequencerService','$scope',function(sequencer, $scope){
    var self = $scope;
    self.sequencer = sequencer.getScheduler();
    //console.log(self.sequencer);
    self.play = function () {
        self.sequencer.play();
    };
    self.debug = function (){
        self.currentTime = self.sequencer.getCurrentTime();
    };
    self.currentTime;
    self.$watch('sequencer.currentTime', function (n, o){
        //console.log(n,o);
        //self.currentTime = n;
    });
}])
.directive("scrollBar", [function(){
    return {
        restrict    : "A",
        scope : true,
        transclude: true,
        link : function ($scope, $el) {
            var scrollHandler = function (e){
                var notePreviews = document.querySelectorAll(".note-preview, .timescale-wrapper-outter");
                var self = angular.element(this)[0];
                angular.forEach(angular.element(notePreviews), function(e) {
                    e.scrollLeft = self.scrollLeft;
                });
            };
            angular.element($el).bind('scroll',scrollHandler);
        },
        template : '<div class="scroll-bar-wrapper">&nbsp;</div>'
    }
}])
.service('notesFactory', [function() {
    return {

    }
}]);

/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
/*
 Reverb effect
 */
angular.module('chorusTunaEffect', []).
factory('chorusTuna',['audioCtx','$timeout', '$http', 'tunaEffectsService',function(audioCtx, $timeout, $http,tunaEffectsService){
    var Chorus = (function () {
        var id = "Chorus";
        var name = "Chorus";
        function Chorus() {
            // Create internal gain nodes
            var localInputGainNode = audioCtx.createGain();
            var localOutputGainNode = audioCtx.createGain();

            // Define parameters for effect
            var params = {
                // Input
                input: null,
                // Output to local gain node
                // Later this node connects to other nodes
                output: localOutputGainNode,
                enabled: true,
                chorusSetting : {
                    rate: 1.5,         //0.01 to 8+
                    feedback: 0.2,     //0 to 1+
                    delay: 0.0045,     //0 to 1
                    bypass: 0          //the value 1 starts the effect as bypassed, 0 or 1
                }
            };
            // Give name for gain node for debugging
            localOutputGainNode.name = "Chorus tuna";

            var chorus = new tunaEffectsService.tuna.Chorus(params.chorusSetting);

            console.log(chorus);

            // Route audio nodes
            localInputGainNode.connect(chorus);

            // Route outputs
            chorus.connect(localOutputGainNode);

            return {
                get rate() {
                    return chorus._rate;
                },
                set rate(a){
                    chorus.rate = a;
                },
                get feedback(){
                  return chorus._feedback;
                },
                set feedback(a){
                    chorus.feedback = a;
                },
                get delay(){
                    return chorus._delay;
                },
                set delay(a){
                    chorus.delay = a;
                },
                get bypass(){
                    return chorus._bypass;
                },
                set bypass(a){
                    chorus.bypass = a;
                },
                get id () {
                    return id;
                },
                get name () {
                    return name;
                },
                get params() {
                    return params;
                },
                /*
                 gain value in decibels.
                 Range:    [-40, 40]
                 */
                set volume(a) {
                    params.gain = a;
                    filter.gain.value = params.gain;
                },
                set input(a) {
                    params.input = a;
                    params.input.connect(localInputGainNode);

                },
                set output(a) {
                    params.output.connect(a);
                },
                disconnect: function () {
                    params.input.disconnect();
                    params.output.disconnect();
                },
                init: function () {

                }
            };
        }
        return Chorus;
    })();
    return Chorus;
}]);

angular.module('filterEffect', []).
factory('filter',['audioCtx','$timeout',function(audioCtx, $timeout){
    var Filter = (function (){
        var id = "filter";
        var name = "Filter";
        function Filter () {
            var localInputGainNode = audioCtx.createGain();
            var localOutputGainNode = audioCtx.createGain();
            var params = {
                filterGain  : 0,
                filterTypes : [
                    'lowpass',
                    'highpass',
                    'bandpass',
                    'lowshelf',
                    'highshelf',
                    'peaking',
                    'notch',
                    'allpass'
                ],
                filterType  : 'lowpass',
                input       : null,
                output      : localOutputGainNode,
                qVal        : 0,
                freq        : 0,
                maxFreq     : audioCtx.sampleRate/2,
                enabled     : true
            };
            var updater = null;



            var filter = audioCtx.createBiquadFilter();



            var update = function () {

                filter.gain.value = params.filterGain;
                filter.frequency.value = params.freq;
                filter.Q.value = params.qVal;
                filter.type = params.filterType;
                //console.log(params);
                updater = $timeout(update,200);
            };

            localInputGainNode.connect(filter);
            filter.connect(localOutputGainNode);
            return {
                get id () {
                    return id;
                },
                get name () {
                    return name;
                },
                set filterType(a) {
                    params.filterType = a;
                    filter.type = params.filterType;
                },
                get params() {
                    return params;
                },
                /*
                 gain value in decibels.
                 Range:    [-40, 40]
                 */
                set volume (a) {
                    params.gain = a;
                    filter.gain.value = params.gain;
                },
                set input (a) {
                    params.input = a;
                    params.input.connect(localInputGainNode);

                },
                set output (a) {
                    params.output.connect(a);
                },
                disconnect: function () {
                    params.input.disconnect();
                    params.output.disconnect();
                    $timeout.cancel(updater);
                },
                init : function (){
                        update();
                }
            };
        }
        return Filter;
    })();
    return Filter;
}]);
/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
/*
Reverb effect
 */
angular.module('reverbEffect', []).
factory('reverb',['audioCtx','$timeout', '$http',function(audioCtx, $timeout, $http){
    var Reverb = (function () {
        var id = "reverb";
        var name = "Reverb";
        function Reverb() {
            // Create internal gain nodes
            var localInputGainNode = audioCtx.createGain();
            var localOutputGainNode = audioCtx.createGain();
            // Specify path to impulses
            var pathToImpulses = "../assets/impulses/";
            // Define parameters for effect
            var params = {
                // List of impulses
                impulses: [
                    {
                        /**
                         * Resource :
                         * http://www.openairlib.net/auralizationdb/content/st-andrews-church
                         */
                        name: "St Andrew's Church",
                        file: 'lyd3_000_ortf_48k.wav'
                    },
                    {
                        /**
                         * Resource :
                         * http://www.openairlib.net/auralizationdb/content/underground-car-park
                         */
                        name: "Underground Car Park",
                        file: "carpark_balloon_ir_stereo_24bit_44100.wav",
                    }
                ],
                // Active impulse
                impulse: null,
                // Input
                input: null,
                // Output to local gain node
                // Later this node connects to other nodes
                output: localOutputGainNode,
                drywet: 0,
                enabled: true
            };
            // Give name for gain node for debugging
            localOutputGainNode.name = "reverb";


            var dry = audioCtx.createGain();
            var wet = audioCtx.createGain();

            // Create reverb effect node
            var convolver = audioCtx.createConvolver();

            // Route audio nodes
            localInputGainNode.connect(convolver);
            convolver.connect(dry);
            convolver.connect(wet);

            // Route outputs
            dry.connect(localOutputGainNode);
            wet.connect(localOutputGainNode);

            // Load impulse from file system
            var loadImpulse = function (impulse) {
                $http({
                    method: "GET",
                    url: pathToImpulses + impulse.file,
                    responseType: 'arraybuffer'

                }).then(function (response) {
                    // Convert loaded impulse into audio buffer
                    audioCtx.decodeAudioData(response.data, function (buffer) {
                        // assign buffer to reverb node
                        convolver.buffer = buffer;
                    }, function (e) {
                        console.log(e);
                    });
                });
            };
            // Mix dry and wet nodes
            var mix = function (val) {
                val = parseFloat(val);
                dry.gain.value = (1.0 - val);
                wet.gain.value = val;
                params.drywet = val;
            };



            return {
                get id () {
                   return id;
                },
                get name () {
                    return name;
                },
                set impulse(a) {
                    params.impulse = a;
                    loadImpulse(a);
                },
                get impulse() {
                    return params.impulse;
                },
                get drywet() {
                    return params.drywet;
                },
                get params() {
                    return params;
                },
                set drywet(a) {
                    mix(a);
                },
                /*
                 gain value in decibels.
                 Range:    [-40, 40]
                 */
                set volume(a) {
                    params.gain = a;
                    filter.gain.value = params.gain;
                },
                set input(a) {
                    params.input = a;
                    params.input.connect(localInputGainNode);

                },
                set output(a) {
                    params.output.connect(a);
                },
                disconnect: function () {
                    params.input.disconnect();
                    params.output.disconnect();
                },
                init: function () {
                        mix(1.0);
                }
            };
        }
        return Reverb;
    })();
    return Reverb;
}]);

/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
/**
 * Resources used to implement functionality for this effect:
 *      https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
 */
angular.module('visualizationEffect', []).
factory('visualization',['audioCtx','$timeout','$rootScope',function(audioCtx, $timeout, $rootScope){
    var Visualization = (function () {
        var id = "visualization";
        var name = "Visualizations";
        function visualization() {
            var localInputGainNode = audioCtx.createGain();
            var localOutputGainNode = audioCtx.createGain();
            var params = {
                input       : null,
                output      : localOutputGainNode
            };
            console.log("sdfsdfs");
            console.log("asdsd");
            var analyser = audioCtx.createAnalyser();

            analyser.fftSize = 2048;
            var bufferl = analyser.fftSize;
            var data = new Uint8Array(bufferl);
            $rootScope.$on("closingSettings", function () {
                console.log("destroyed!!!!!");
            });
            function draw() {

                drawVisual = requestAnimationFrame(draw);

                analyser.getByteTimeDomainData(data);

                canvasCtx.fillStyle = 'rgb(0, 53, 67)';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = 'rgb(255, 255, 255)';

                canvasCtx.beginPath();

                var sliceWidth = WIDTH * 1.0 / bufferl;
                var x = 0;

                for(var i = 0; i < bufferl; i++) {

                    var v = data[i] / 128.0;
                    var y = v * HEIGHT/2;

                    if(i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                canvasCtx.lineTo(canvas.width, canvas.height/2);
                canvasCtx.stroke();
            };

            localInputGainNode.connect(analyser);
            localInputGainNode.connect(localOutputGainNode);

            return {
                get id () {
                    return id;
                },
                get name () {
                    return name;
                },
                get params() {
                    return params;
                },
                set input (a) {
                    params.input = a;
                    params.input.connect(localInputGainNode);

                },
                set output (a) {
                    params.output.connect(a);
                },
                disconnect: function () {
                    params.input.disconnect();
                    params.output.disconnect();
                },
                init : function (){
                    $timeout(function() {
                        canvas = document.querySelector('.visualizer');
                        console.log(canvas);
                        canvasCtx = canvas.getContext("2d");
                        WIDTH = canvas.width;
                        HEIGHT = canvas.height;
                        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                        draw();
                    },2000);
                }
            };
        }
        return visualization;
    })();
    return Visualization;
}]);
/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('simple_sampler', [])
.factory('simpleSampler', ['audioCtx','$rootScope', '$http' ,'midiHandlerService', 'devicesService','$timeout', function(audioCtx, $rootScope, $http, midiHandlerService, devicesService, $timeout){
    var SimpleSampler = (function () {
        var name = "Simple Sampler";
        var id = "simple_sampler";

        function Instrument () {

            var gainNode = audioCtx.createGain();
            var activeNotes = [];
            var name = "Simple Sampler";
            var id = "simple_sampler";
            var devname = "";
            var notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].sort();
            var notesList = [];
            var c = 0;
            var o = 0;
            var initialNote;
            for ( var i = 21 ; i < 109 ; i++ ) {
                if ( notes[c%12] == "C" ) {
                    o++;
                }
                if ( notes[c%12] == "A" && o == 4 ) {
                    initialNote = {
                        letter : notes[c%12],
                        octave : o,
                        number : i
                    };
                }
                notesList.push({
                    letter : notes[c%12],
                    octave : o,
                    number : i
                });
                c++;
            }
            var params = {
                notesList : notesList,
                gain : 0.5,
                output : gainNode,
                currentNote : initialNote,
                currentSample : null,
                assignedSamples : [],
                samples: [
                    {
                        name : "bop kick - snares on - 3",
                        filename : "jazz_funk_drums/bop kick - snares on - 3.wav"
                    },
                    {
                        name : "snare - snares on - 6",
                        filename : "jazz_funk_drums/snare - snares on - 6.wav"
                    },
                    {
                        name : "hihat - close - 2",
                        filename : "jazz_funk_drums/hihat - close - 2.wav"
                    },
                    {
                        name : "stickshot - snares on - 6",
                        filename : "jazz_funk_drums/stickshot - snares on - 6.wav"
                    },
                    {
                        name : "rimshot - snares on - 1",
                        filename : "jazz_funk_drums/rimshot - snares on - 1.wav"
                    },
                    {
                        name : "ride - 1",
                        filename : "jazz_funk_drums/ride - 1.wav"
                    },
                    {
                        name : "hihat - open - 1",
                        filename : "jazz_funk_drums/hihat - open - 1.wav"
                    },
                    {
                        name : "floor tom - snares on - 8",
                        filename : "jazz_funk_drums/floor tom - snares on - 8.wav"
                    }
                ]
            };
            var d;
            var m;
            $timeout(function(){
                d = devicesService.get(devname);
            },0);

            var noteFromFrequency = function (freq) {

                var noteNum = 12 * (Math.log( freq / 440 ) / Math.log(2) );
                return Math.round( noteNum ) + 69;
            };

            function dec2hex(d, padding) {
                var hex = Number(d).toString(16);
                padding = typeof (padding) === "undefined" || padding === null ? padding = 2 : padding;

                while (hex.length < padding) {
                    hex = "0" + hex;
                }

                return hex;
            }

            var assignSample = function ( sample, note ) {
                $http({
                    method          : "GET",
                    url             : "assets/samples/" + sample.filename,
                    responseType    : "arraybuffer"
                }).then(function(response){
                    //console.log(note.number);
                    if (m){
                        var message = [
                            "0x"+dec2hex(144),"0x"+dec2hex(note.number),"0x"+dec2hex(127)
                        ]
                        m.midi.output.send(message);
                    }
                    audioCtx.decodeAudioData( response.data, function (buffer) {
                        params.assignedSamples["" + note.number + ""] = sample;
                        params.assignedSamples["" + note.number + ""].buffer = buffer;
                        params.assignedSamples["" + note.number + ""].panner = audioCtx.createStereoPanner();
                        params.assignedSamples["" + note.number + ""].gainNode = audioCtx.createGain();
                    });

                });

            };

            var initSample = function ( freq, schedule, velocity ) {
                var note = noteFromFrequency(freq);
                var sample = params.assignedSamples["" + note + ""];
                //console.log(sample, note);
                if ( !sample ) return;

                var source = audioCtx.createBufferSource();

                source.buffer = sample.buffer;
                source.connect(sample.panner);
                sample.panner.connect(sample.gainNode);
                sample.gainNode.connect(gainNode);

                source.start(0);
                return {
                    src : source,
                    freq : freq
                };
            };

            var play = function(freq, schedule, velocity) {
                initSample(freq, schedule, velocity);
                //activeNotes.push(sample);
            };


            var stop = function(frequency, stopAll) {
                var newNotes = [];
                for ( var i = 0 ; i < activeNotes.length ; i++ ) {
                    if ( (Math.round(activeNotes[i].freq) === Math.round(frequency)) || stopAll ) {
                        activeNotes[i].src.stop(0);
                        activeNotes[i].src.disconnect();
                    } else {
                        newNotes.push(activeNotes[i]);
                    }
                }
                activeNotes = newNotes;
            };
            return {
                set output(a) {
                    params.output.disconnect();
                    params.output.connect(a);
                },
                set devname(a) {
                    devname = a;
                    //console.log(a);
                    //console.log("set name: " + a + ", for :", idd  );
                },
                get devname () {
                    return devname;
                },
                get id (){
                    return id;
                },
                get currentNote() {
                    return params.currentNote;
                },
                get pan(){
                   return (params.currentSample) ? params.currentSample.params.pan : null;
                },
                set pan(a){
                    params.currentSample.params.pan = a;
                    params.currentSample.panner.pan.value = a;
                },
                get sampleGain(){
                  return (params.currentSample)?params.currentSample.params.gain:null;
                },
                set sampleGain(a){
                    if (m) {
                        var message = [
                            "0x" + dec2hex(144), "0x" + dec2hex(params.currentNote.number), "0x" + dec2hex(Math.round(127 * a))
                        ]
                        m.midi.output.send(message);
                    }
                    params.currentSample.params.gain = a;
                    params.currentSample.gainNode.gain.value = a;
                },
                set currentNote(a) {

                    params.currentNote = a;
                    params.currentSample = params.assignedSamples[a.number];
                    //console.log(params.currentSample);
                },
                get currentSample() {
                    return params.currentSample;
                },
                set currentSample(a){
                    if (!m)
                    m = midiHandlerService.getActive(d);
                    params.currentSample = a;
                    params.currentSample.params = {
                        pan : 0,
                        gain : 0.5,
                        duration : 1
                    };
                    assignSample(a, params.currentNote);
                },
                get notes () {
                    return notesList;
                },
                set volume (a) {
                    params.gain = a;
                    params.output.gain.value = params.gain;
                    //console.log(a);
                },
                get volume () {
                    return params.gain;
                },
                get params (){
                    return params;
                },
                play : play,
                stop : stop,
                detachSample : function(){
                    if (m){
                        var message = [
                            "0x"+dec2hex(144),"0x"+dec2hex(params.currentNote.number),"0x"+dec2hex(0)
                        ];
                        m.midi.output.send(message);
                    }
                    delete params.assignedSamples[params.currentNote.number];
                    params.currentSample = undefined;
                }
            }
        }
        return Instrument;
    })();
    return SimpleSampler;
}]);
/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('simpleSynth', [])
.factory('simpleSynth', ['audioCtx','$rootScope', function(audioCtx, $rootScope){

    var SimpleSynth = (function () {
        var name = "Simple synthesizer";
        var id = "simple_synth";

        function Instrument () {
            var gainNode = audioCtx.createGain();
            var stereoPanner1 = audioCtx.createStereoPanner();
            var stereoPanner2 = audioCtx.createStereoPanner();
            var activeNotes = [];
            var devname = "";

            var params = {
                gain : 0.5,
                output : gainNode,
                synthTypes : ['square', 'sine', 'triangle','sawtooth'],
                osc1 : {
                    enabled : true,
                    synthType : 'square',
                    octave : 0,
                    // [-1 (left),0(center) , 1(right)]
                    pan     : 0,
                },
                osc2 : {
                    enabled : true,
                    synthType : 'sine',
                    octave : -2,
                    // [-1 (left),0(center) , 1(right)]
                    pan     : 0,
                }
            };
            /*
            schedule {
                start, stop, velocity
            }
             */
            var initOscillators = function (freq, schedule, velocity) {
                if ( !velocity ) {
                    velocity = 127;
                }
                velocity /= 127;
                var scheduled;
                if ( !schedule ) {
                    var schedule = {
                        start : 0,
                        stop  : 0
                    }
                    scheduled = false;
                } else {
                    scheduled = true;
                }
                //console.log(velocity);
                var oscillators = {
                    freq : freq,
                    osc : []
                };
                var velocityNode = audioCtx.createGain();
                velocityNode.gain.value = parseFloat(velocity); // TODO Tune velocity
                //console.log(velocityNode.gain.value);
                if ( params.osc1.enabled ) {
                    var osc1 = audioCtx.createOscillator();
                    osc1.name = devname;
                    osc1.connect(stereoPanner1);
                    stereoPanner1.connect(params.output);
                    //velocityNode.connect(params.output);
                    for ( var i = 0 ; i < Math.abs(params.osc1.octave) ; i++ ) {
                        if ( params.osc1.octave < 0 ) {
                            freq -= freq/2;
                        } else if ( params.osc1.octave > 0) {
                            freq += freq*2;
                        }
                    }
                    osc1.frequency.value = freq;
                    osc1.type = params.osc1.synthType;
                    //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
                    osc1.start(schedule.start);
                    oscillators.osc.push(osc1);
                    if ( scheduled ) {
                        osc1.stop(schedule.stop);
                    }

                }
                if ( params.osc2.enabled ) {
                    osc2 = audioCtx.createOscillator();
                    osc2.name = devname;
                    osc2.connect(stereoPanner2);
                    stereoPanner2.connect(params.output);
                    //velocityNode.connect(params.output);
                    for ( var i = 0 ; i < Math.abs(params.osc2.octave) ; i++ ) {
                        if ( params.osc2.octave < 0 ) {
                            freq -= freq/2;
                        } else if ( params.osc2.octave > 0) {
                            freq += freq*2;
                        }
                    }
                    osc2.frequency.value = freq;

                    osc2.type = params.osc2.synthType;
                    //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
                    osc2.start(schedule.start);
                    oscillators.osc.push(osc2);
                    if ( scheduled ) {
                        osc2.stop(schedule.stop);
                    }
                }
                return oscillators;
            };
            var play = function(freq, schedule, velocity) {
                var osc = initOscillators(freq, schedule, velocity);
                activeNotes.push(osc);
            };


            var stop = function(frequency, stopAll) {
                var newNotes = [];
                for ( var i = 0 ; i < activeNotes.length ; i++ ) {
                    if ( (Math.round(activeNotes[i].freq) === Math.round(frequency)) || stopAll ) {
                        activeNotes[i].osc.forEach(function(o){
                            o.stop(0);
                            //console.log(o.name);
                            o.disconnect();
                        });
                    } else {
                        newNotes.push(activeNotes[i]);
                    }
                }
                activeNotes = newNotes;
            };
            return {
                set output(a) {
                    params.output.disconnect();
                    params.output.connect(a);
                },
                set devname(a) {
                    devname = a;
                    //console.log("set name: " + a + ", for :", idd  );
                },
                set osc1Pan (a) {
                    stereoPanner1.pan.value = a;
                    params.osc1.pan = a;
                },
                set osc2Pan (a) {
                    stereoPanner2.pan.value = a;
                    params.osc2.pan = a;
                },
                get osc1Pan () {
                    return params.osc1.pan;
                },
                get osc2Pan () {
                    return params.osc2.pan;
                },
                get devname () {
                    return devname;
                },
                get id (){
                    return id;
                },
                set volume (a) {
                    params.gain = a;
                    params.output.gain.value = params.gain;
                    //console.log(a);
                },
                get volume () {
                    return params.gain;
                },
                get params (){
                    return params;
                },
                play : play,
                stop : stop,
            }
        }
        return Instrument;
    })();
    return SimpleSynth;
}]);








//var name = "Simple Synth";
//var id = "simple_synth";
//var gainNode = audioCtx.createGain();
//var devname = "";
//var params = {
//    gain : 0.5,
//    output : gainNode,
//    synthTypes : ['square', 'sine', 'triangle','sawtooth'],
//    osc1 : {
//        enabled : true,
//        synthType : 'square',
//        octave : 0
//    },
//    osc2 : {
//        enabled : true,
//        synthType : 'sine',
//        octave : -2
//    }
//};
//gainNode.name = "instrument: " + name;
//var activeNotes = [];
//
//var initOscillators = function (freq) {
//    var oscillators = {
//        freq : freq,
//        osc : []
//    };
//    if ( params.osc1.enabled ) {
//        osc1 = audioCtx.createOscillator();
//
//        osc1.connect(params.output);
//        for ( var i = 0 ; i < Math.abs(params.osc1.octave) ; i++ ) {
//            if ( params.osc1.octave < 0 ) {
//                freq -= freq/2;
//            } else if ( params.osc1.octave > 0) {
//                freq += freq*2;
//            }
//        }
//        osc1.frequency.value = freq;
//        osc1.type = params.osc1.synthType;
//        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
//        osc1.start(0);
//        oscillators.osc.push(osc1);
//    }
//    if ( params.osc2.enabled ) {
//        osc2 = audioCtx.createOscillator();
//
//        osc2.connect(params.output);
//        for ( var i = 0 ; i < Math.abs(params.osc2.octave) ; i++ ) {
//            if ( params.osc2.octave < 0 ) {
//                freq -= freq/2;
//            } else if ( params.osc2.octave > 0) {
//                freq += freq*2;
//            }
//        }
//        osc2.frequency.value = freq ;
//        osc2.type = params.osc2.synthType;
//        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
//        osc2.start(0);
//        oscillators.osc.push(osc2);
//    }
//    return oscillators;
//};
//
//
//var play = function(freq,name) {
//    var osc = initOscillators(freq);
//    activeNotes.push(osc);
//    console.log(freq,name);
//};
//
//var stopAll = function () {
//    for ( var i = 0 ; i < activeNotes.length ; i++ ) {
//        activeNotes[i].stop(0);
//    }
//};
//
//var stop = function(frequency) {
//    var newNotes = [];
//    for ( var i = 0 ; i < activeNotes.length ; i++ ) {
//        if ( Math.round(activeNotes[i].freq) === Math.round(frequency) ) {
//            activeNotes[i].osc.forEach(function(o){
//                o.stop(0);
//                o.disconnect();
//            });
//        } else {
//            newNotes.push(activeNotes[i]);
//        }
//    }
//    activeNotes = newNotes;
//};
//return {
//    set devnamez (a) {
//        devname = a;
//    },
//    get devnamez () {
//      return devname;
//    },
//    get id(){
//      return id;
//    },
//    set volume(a) {
//        params.gain = a;
//        params.output.gain.value = params.gain;
//        console.log(a);
//    },
//    get volume() {
//        return params.gain;
//    },
//    get params(){
//      return params;
//    },
//    play : play,
//    stop : stop,