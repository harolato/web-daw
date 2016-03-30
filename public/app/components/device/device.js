/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('Devices', ['Instruments']).
directive('notesPreview', [function(){
    return {
        restrict : "A",
        require : "^device",
        template : ''
    }
}]).
directive('toggleDeviceState', ['$compile', function($compile){
    return {
        restrict : "A",
        require: '^device',
        scope : true,
        link : function ($scope, element ,attrs, controller) {
            $scope.device = controller.scope.device;
            element.on('click', function () {
                controller.scope.toggleEnabled();
                controller.scope.$apply();
            });
            $scope.addClass = function (){
                return {
                    'fa-toggle-on' : $scope.device.enabled,
                    'fa-toggle-off' : !$scope.device.enabled
                }
            };

        },
        template : '<span ng-class="addClass()" class="fa"></span> On/Off'
    }
}])
.directive('toggleKeyboardInput', [function(){
    return {
        restrict : "A",
        require: '^device',
        scope : true,
        link : function ($scope, element ,attrs, controller) {
            $scope.device = controller.scope.device;
            element.on('click', function () {
                controller.scope.toggleNoteInput();
                controller.scope.$apply();
            });
            $scope.addClass = function (){
                return {
                    'fa-circle' : $scope.device.note_input,
                    'fa-circle-o' : !$scope.device.note_input
                }
            };
        },
        template : '<span ng-class="addClass()" class="fa"></span> MIDI control'
    }
}])
.directive('slider', ['sliderHelper', function(sliderHelper){
    return {
        restrict : "A",
        require : 'ngModel',
        scope : true,
        link : function ($scope, $element, attrs, ngModel) {

            //console.log(ngModel.$viewValue);


            angular.element(document).ready(function(){

                $scope.Math = window.Math;
                var slider = $element[0].querySelector('.slider');
                var sliderValue = slider.querySelector('.value-bar');


                function updateModel ( value ) {
                    $scope.value = value;
                    ngModel.$setViewValue(value/100);
                    ngModel.$render();
                }
                updateModel( (ngModel.$modelValue * 100) );
                sliderValue.style.width = parseInt($scope.value)  + '%';
                ngModel.$render = function() {
                    $scope.value = ngModel.$viewValue * 100;
                    sliderValue.style.width = parseInt($scope.value)  + '%';
                };
                var value;
                angular.element(slider).on('mousedown', function (e) {
/////     Implement touch functionality
//                    if (e.type == "touchstart" ) {
//                        var ee = angular.element(slider)[0];
//                        console.log([
//                            ee.getBoundingClientRect()
//                        ]);
//                        console.log([
//                            e
//                        ]);
//                    }
                    e.preventDefault();
                    angular.element(slider).on('mousemove', function (e) {
                        e.preventDefault();

                        value = ( e.offsetX * 100 ) / slider.offsetWidth;
                        updateModel(value);
                        sliderValue.style.width = $scope.value + '%';
                        angular.element(slider).on('mouseout', function () {
                            angular.element(slider).off('mousemove');
                            angular.element(slider).off('mouseout');
                        });
                    });
                    $scope.value = ( e.offsetX * 100 ) / slider.offsetWidth;
                    updateModel(value);
                    sliderValue.style.width = $scope.value + '%';

                    angular.element(slider).on('mouseup, touchend', function (e) {
                        angular.element(slider).off('mousemove');
                        updateModel(value);
                    });
                })
            });
        },
        controller : function ( $scope ) {
            $scope.sliderObject = sliderHelper.getSlider($scope.ctrl);
            $scope.sliderObject.value = $scope.value;

            $scope.$watch('value', function (val, old) {
                if (val !== old) {
                    $scope.sliderObject.value = val;
                }
            });
        },
        template : '<div class="slider"><div class="value-bar">{{Math.round(value)}}%</div></div>'
    }
}])
.service('sliderHelper' , [function () {
    var Slider = function ( device ) {
        this.device = device;
        this.value = null;
    };
    Slider.prototype.setValue = function ( value ) {
        this.value = value;
    };
    Slider.prototype.getValue = function ( type ) {
        switch ( type ) {
            case "%" : this.value;
            case type.indexOf("range|") > 0 : alert('asd') ;
        }
    }
    return {
        getSlider : function (device) {
            return new Slider(device);
        }
    }
}])
.directive('device', function ($compile, devicesService, InstrumentsService, masterGain, sliderHelper) {
    return {
        restrict : "A",
        scope : {
            instrument_name : '@instrument',
            identification : '@',
            enabled : '@',
            type : '@device'
        },

        link : function (scope, el, attr){
            //var ctr = angular.element(el[0].querySelector('div[instrument-control]'));
            ////console.log(scope);
            //ctr.attr('instr', scope.device.instrument_instance.id);
            scope.$watch('identification', function (n){
                console.log("watch: ",n);
            });

            scope.closeSettings = function () {
                var settings = angular.element(document.querySelector('#instrument-settings'));
                settings.html("");
            }
        },
        controller : function ( $scope) {
            var vm = $scope;
            vm.params = {
                gain : 0.7
            };
            console.log(vm);

            // Initialize device object for data binding
            if ( vm.type == "" ) {
                vm.device = devicesService.add(vm.identification,vm);
                vm.device.instrument_instance = InstrumentsService.getInstrument(vm.instrument_name, vm.device);
            } else {
                vm.device = devicesService.get(vm.identification);
                vm.device.instrument_instance = vm.device.instrument_instance;
            }

            vm.device.enabled = vm.enabled;

            //vm.device.instrument_instance = instrumentsService.load('simpleSynth', audioCtx, masterGain, vm.device);
            vm.volumeSlider = sliderHelper.getSlider(vm.device);

            // Assign default device name
            vm.device.name = vm.device._id;
            vm.device.gainNode.connect(masterGain);
            vm.$watch('params.gain', function(val) {
                if ( !isNaN(val) ) {
                    vm.device.gainNode.gain.value = val;
                } else {
                    console.log("nan");
                }
            });
            //console.log(vm.device);
            // Hidden input flag
            vm.nameChange = true;
            // Toggle name change input field
            vm.changeName = function () {
                vm.nameChange = !vm.nameChange;
            };

            vm.openSettings = function(){
                var settings = angular.element(document.querySelector('div#instrument-settings'));
                console.log(vm.device._id);
                settings.html("");
                var el = $compile('<div device="settings" identification="'+ vm.device._id + '">')(vm);
                settings.append(el);
            };

            // Toggle device state. Enable/Disable

            vm.toggleEnabled = function (nonDirective) {
                if (!nonDirective) vm.device.enabled = !vm.device.enabled;
                //console.log(vm.device.enabled);
            };
            //vm.$watch('device.note_input', function (n,o){
            //    console.log([vm.device.name,n,o]);
            //});
            // Toggle note input. Enable/Disable
            vm.toggleNoteInput = function (nonDirective) {
                if (!nonDirective) vm.device.note_input = !vm.device.note_input;
                devicesService.toggleNoteInput(vm.device._id);
            };
            // output current devices
            vm.cons = function () {
                console.log(devicesService.getAll());
            };
            vm.getDeviceClass = function () {
                return {
                    'device-disabled' : !vm.device.enabled
                }
            };

            var instance = vm.device._id;
            function randomNumber(min, max, incl) {
                incl = (incl) ? 1 : 0;
                return Math.floor(Math.random() * ( max - min + incl )) + min;
            }
            vm.changeNote = function (){
                vm.device.notes[0].start = "0.0.1";
            };

            if ( vm.device.name ==  "sine synth") {
                vm.device.notes = [
                    { // 1/8 G , 1st bar beginning , 1st quarter note beginning
                        target  : instance,
                        start   : "0.0.0",
                        end     : "0.1.0",
                        note    : "G2",
                        velocity: parseFloat("0." + randomNumber(3,9)) // Velocity indicated note volume
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.2.0",
                        end     : "0.3.0",
                        note    : "G2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 E    2nd quarter note. 1/8+1/8 = 1/4
                        target  : instance,
                        start   : "0.0.1",
                        end     : "0.1.1",
                        note    : "E2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "0.2.1",
                        end     : "0.3.1",
                        note    : "C2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.0.2",
                        end     : "0.1.2",
                        note    : "G2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.2.2",
                        end     : "0.3.2",
                        note    : "G2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 E
                        target  : instance,
                        start   : "0.0.3",
                        end     : "0.1.3",
                        note    : "E2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "0.2.3",
                        end     : "0.3.3",
                        note    : "C2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 F   2nd bar beginning
                        target  : instance,
                        start   : "1.0.0",
                        end     : "1.1.0",
                        note    : "F2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 A
                        target  : instance,
                        start   : "1.2.0",
                        end     : "1.3.0",
                        note    : "A2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "1.0.1",
                        end     : "1.1.1",
                        note    : "C3",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/8 A
                        target  : instance,
                        start   : "1.2.1",
                        end     : "1.3.1",
                        note    : "A2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/4 G
                        target  : instance,
                        start   : "1.0.2",
                        end     : "1.3.2",
                        note    : "G2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    },
                    {// 1/4 G
                        target  : instance,
                        start   : "1.0.3",
                        end     : "1.3.3",
                        note    : "G2",
                        velocity: parseFloat("0." + randomNumber(3,9))
                    }];
            } else if ( vm.device.name == "square synth" ) {
                vm.device.notes = [
                    { // 1/8 G , 1st bar beginning , 1st quarter note beginning
                        target  : instance,
                        start   : "0.0.0",
                        end     : "0.0.1",
                        note    : "G4",
                        velocity: 1  // Velocity indicated note volume
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.0.1",
                        end     : "0.1.0",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/8 E    2nd quarter note. 1/8+1/8 = 1/4
                        target  : instance,
                        start   : "0.1.0",
                        end     : "0.1.1",
                        note    : "E4",
                        velocity: 1
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "0.1.1",
                        end     : "0.2.0",
                        note    : "C4",
                        velocity: 1
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.2.0",
                        end     : "0.2.1",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.2.1",
                        end     : "0.3.0",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/8 E
                        target  : instance,
                        start   : "0.3.0",
                        end     : "0.3.1",
                        note    : "E4",
                        velocity: 1
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "0.3.1",
                        end     : "1.0.0",
                        note    : "C4",
                        velocity: 1
                    },
                    {// 1/8 F   2nd bar beginning
                        target  : instance,
                        start   : "1.0.0",
                        end     : "1.0.1",
                        note    : "F4",
                        velocity: 1
                    },
                    {// 1/8 A
                        target  : instance,
                        start   : "1.0.1",
                        end     : "1.1.0",
                        note    : "A4",
                        velocity: 1
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "1.1.0",
                        end     : "1.1.1",
                        note    : "C5",
                        velocity: 1
                    },
                    {// 1/8 A
                        target  : instance,
                        start   : "1.1.1",
                        end     : "1.2.0",
                        note    : "A4",
                        velocity: 1
                    },
                    {// 1/4 G
                        target  : instance,
                        start   : "1.2.0",
                        end     : "1.3.0",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/4 G
                        target  : instance,
                        start   : "1.3.0",
                        end     : "2.0.0",
                        note    : "G4",
                        velocity: 1
                    }];
            }


            this.scope = vm;
        },
        templateUrl : function (e, a){
                if ( a.device == "" ) {
                    return 'app/components/device/view.html';
                } else {
                    return'app/components/device/device-settings.html'
                }
            }
        }
}).
service('devicesService',['utilitiesService','keyboardHelperService','audioCtx', function(utilitiesService, keyboardHelperService, audioCtx) {
    this.list = [];



    function randomNumber(min, max, incl) {
        incl = (incl) ? 1 : 0;
        return Math.floor(Math.random() * ( max - min + incl )) + min;
    }

    var genNotes = function ( id ) {
        var i;
        var notes = [];
        var letters = ["C","D","E","F","G","A","B"];
        for ( i = 0; i < 1000 ; i++) {
            var bar = randomNumber(0,50, true);
            var qt = randomNumber(0,3, true);
            var eighth = randomNumber(0,3, true);
            var start = bar + "." + qt + "." + eighth;
            var end = randomNumber(bar,bar + randomNumber(0,1), true) + "." + randomNumber(qt,3, true) + "." + randomNumber(eighth,3, true);
            notes.push({
                target  : id,
                start   : start,
                end     : end,
                note    : letters[randomNumber(0,6, true)] + randomNumber(3, 7),
                velocity: "0." + randomNumber(4,9)
            });
        }
        return notes;
    }
    this.add = function (id, instance) {
        // Device model
        var device = {
            '_id' : id,
            'name' : null,
            device_instance : instance,
            instrument_instance : null,
            enabled : true,
            note_input : (this.list.length == 0),
            notes :genNotes(id),
            gainNode : audioCtx.createGain(),
            effects_chain : null,
        };
        // Push initial data to global device array
        if (this.list.length == 0) {
            keyboardHelperService.setKeyboardUser(device);
        }
        this.list.push(device);
        //console.log(device);
        // Return current model for controller
        return device;
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
    this.get = function ( id ) {
        var i ;
        var allDevices = this.getAll();
        for ( i = 0 ; i < allDevices.length ; i++) {
            if ( id === allDevices[i]._id ) {
                return allDevices[i];
            }
        }
    };
    //devices.connect = function (source, destination) {
    //    var sourceDevice = devices.get(source);
    //    var destinationDevice = devices.get(destination);
    //    source.output.push(destination);
    //    destination.input.push(source);
    //};
    this.getAll = function () {
        return this.list;
    }
}]).
controller('devicesController', ['utilitiesService', 'devicesService', function(utilitiesService, devicesService) {
    var vm = this;
}]);