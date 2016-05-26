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