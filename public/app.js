function ADSR(audioContext){
    var node = audioContext.createGain()

    var voltage = node._voltage = getVoltage(audioContext)
    var value = scale(voltage)
    var startValue = scale(voltage)
    var endValue = scale(voltage)

    node._startAmount = scale(startValue)
    node._endAmount = scale(endValue)

    node._multiplier = scale(value)
    node._multiplier.connect(node)
    node._startAmount.connect(node)
    node._endAmount.connect(node)

    node.value = value.gain
    node.startValue = startValue.gain
    node.endValue = endValue.gain

    node.startValue.value = 0
    node.endValue.value = 0

    Object.defineProperties(node, props)
    return node
}

var props = {

    attack: { value: 0, writable: true },
    decay: { value: 0, writable: true },
    sustain: { value: 1, writable: true },
    release: {value: 0, writable: true },

    getReleaseDuration: {
        value: function(){
            return this.release
        }
    },

    start: {
        value: function(at){
            var target = this._multiplier.gain
            var startAmount = this._startAmount.gain
            var endAmount = this._endAmount.gain

            this._voltage.start(at)
            this._decayFrom = this._decayFrom = at+this.attack
            this._startedAt = at

            var sustain = this.sustain

            target.cancelScheduledValues(at)
            startAmount.cancelScheduledValues(at)
            endAmount.cancelScheduledValues(at)

            endAmount.setValueAtTime(0, at)

            if (this.attack){
                target.setValueAtTime(0, at)
                target.linearRampToValueAtTime(1, at + this.attack)

                startAmount.setValueAtTime(1, at)
                startAmount.linearRampToValueAtTime(0, at + this.attack)
            } else {
                target.setValueAtTime(1, at)
                startAmount.setValueAtTime(0, at)
            }

            if (this.decay){
                target.setTargetAtTime(sustain, this._decayFrom, getTimeConstant(this.decay))
            }
        }
    },

    stop: {
        value: function(at, isTarget){
            if (isTarget){
                at = at - this.release
            }

            var endTime = at + this.release
            if (this.release){

                var target = this._multiplier.gain
                var startAmount = this._startAmount.gain
                var endAmount = this._endAmount.gain

                target.cancelScheduledValues(at)
                startAmount.cancelScheduledValues(at)
                endAmount.cancelScheduledValues(at)

                var expFalloff = getTimeConstant(this.release)

                // truncate attack (required as linearRamp is removed by cancelScheduledValues)
                if (this.attack && at < this._decayFrom){
                    var valueAtTime = getValue(0, 1, this._startedAt, this._decayFrom, at)
                    target.linearRampToValueAtTime(valueAtTime, at)
                    startAmount.linearRampToValueAtTime(1-valueAtTime, at)
                    startAmount.setTargetAtTime(0, at, expFalloff)
                }

                endAmount.setTargetAtTime(1, at, expFalloff)
                target.setTargetAtTime(0, at, expFalloff)
            }

            this._voltage.stop(endTime)
            return endTime
        }
    },

    onended: {
        get: function(){
            return this._voltage.onended
        },
        set: function(value){
            this._voltage.onended = value
        }
    }

}

var flat = new Float32Array([1,1])
function getVoltage(context){
    var voltage = context.createBufferSource()
    var buffer = context.createBuffer(1, 2, context.sampleRate)
    buffer.getChannelData(0).set(flat)
    voltage.buffer = buffer
    voltage.loop = true
    return voltage
}

function scale(node){
    var gain = node.context.createGain()
    node.connect(gain)
    return gain
}

function getTimeConstant(time){
    return Math.log(time+1)/Math.log(100)
}

function getValue(start, end, fromTime, toTime, at){
    var difference = end - start
    var time = toTime - fromTime
    var truncateTime = at - fromTime
    var phase = truncateTime / time
    return start + phase * difference
}

angular.module('waw', [ 'Devices', 'Instruments', 'keyboard', 'Sequencer', 'midiHandler']).
controller('mainController',['$scope', 'midiHandlerService', function($scope, midi){
    var vm = this;
    vm.midi = midi;
    vm.message = "WAW v2";
}]).
    directive('addComponent' , ['$compile', 'utilitiesService',function($compile, utilitiesService) {
        return {
            restrict : "A",
            scope : true,
            link : function (scope, element , attrs) {
                scope.createNew = function () {
                    //console.log(scope);
                    var el = $compile("<" + attrs.addComponent + "></" + attrs.addComponent + ">")(scope);
                    if ( attrs.addComponent == "device" ) {
                        el.attr('data-id', utilitiesService.uniqueId());
                    } else {
                        el.attr('shit', 'device');
                    }
                    element.parent().append(el);
                }
            }
        }
    }])
    // Audio context object
    .factory('audioCtx', function () {
        var ctx = null;
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContext();
        return ctx;
    })
    // Master gain object
    .directive('masterGain', function(masterGain, frequencyFilter) {
        return {
            restrict : "E",
            scope : {
                value : '='
            },
            controller : function ( $scope, $element ) {
                $scope.gain = 0.2;
                $scope.changeVolume = function () {
                    masterGain.gain.value = $scope.gain;

                }
            },
            template : 'Master Gain[Volume]' +
            '<input ng-change="changeVolume()" ng-model="gain" type="range" min="0" max="1" step=".0001">'
        }
    }).

    // Filter
    directive('filter', function(masterGain, frequencyFilter) {
        return {
            restrict : "E",
            scope : {
                value : '='
            },
            controller : function ( $scope, $element ) {
                $scope.freq = 0;
                $scope.Q = 0;
                $scope.changeFreq = function () {
                    frequencyFilter.filter.frequency.value = $scope.freq;
                }
                $scope.changeQ = function () {
                    frequencyFilter.filter.Q.value = $scope.Q;
                }
            },
            template : '<p>Master low pass frequency filter</p>' +
            '<input ng-change="changeFreq()" ng-model="freq" type="range" min="0" max="350" step=".0001">' +
            '<input ng-change="changeQ()" ng-model="Q" type="range" min="0" max="10" step=".0001">'
        }
    })
    .factory('masterGain', function(audioCtx){
        var mGain = audioCtx.createGain();
        mGain.gain.value = 0.5;
        mGain.connect(audioCtx.destination);
        return mGain;
    })
    .factory('frequencyFilter', function(audioCtx, masterGain){
        var filter = audioCtx.createBiquadFilter();

        var obj = {
            filter : filter,
            input : null,
            output : masterGain,
            join : function (instrument) {
                this.input = instrument;
                instrument.connect(this.filter);
            }
        };
        filter.type = 'lowpass';
        filter.frequency.value = 200;
        filter.Q.value = 10;
        filter.connect(obj.output)
        return obj;
    })
    .service('utilitiesService', function() {
    this.uniqueId = function () {
        var idstr=String.fromCharCode(Math.floor((Math.random()*25)+65));
        do {
            // between numbers and characters (48 is 0 and 90 is Z (42-48 = 90)
            var ascicode=Math.floor((Math.random()*42)+48);
            if (ascicode<58 || ascicode>64){
                // exclude all chars between : (58) and @ (64)
                idstr+=String.fromCharCode(ascicode);
            }
        } while (idstr.length<32);

        return (idstr);
    }
});


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
angular.module('Instruments',['simpleSynth', 'anotherSynth'])
.directive('instrumentControl', [function(){
    return {
        restrict : "A",
        scope : true,
        link : function ($scope, $el, $attr) {
            $scope.getTemplate = function () {
                return 'app/components/instruments/' + $scope.device.instrument_instance.id + '/view.html'
            }
            $scope
        },
        controller : function ($scope) {
            $scope.instrument = $scope.device.instrument_instance;
        },
        template : '<div class="instrument-control-outer-wrapper" ng-include="getTemplate()"></div>'
    };
}])
.directive('addEffect', [function(){
    return {
        restrict : "A",
        scope : true,
        transclude : true,
        link : function ($scope, $el, $attr) {

        },
        controller : function ($scope) {
            $scope.instrument = $scope.device.instrument_instance;
        },
        templateUrl : 'app/components/instruments/addEffectsDirective.html'
    };
}])
.controller('InstrumentsController', ['InstrumentsService', 'utilitiesService', function (InstrumentsService, utilitiesService) {
    var vm = this;
    vm.instruments = InstrumentsService;
    //console.log(vm.instruments);
    vm.crack = 1;
}]).
service('InstrumentsService',['simpleSynth', 'anotherSynth','utilitiesService', function(simpleSynth, anotherSynth, utilitiesService){
    this.availableInstruments = {
        "simple_synth" : simpleSynth,
        "another_synth" : anotherSynth
    };
    this.getInstrument = function ( name, device ) {
        var id = utilitiesService.uniqueId();
        return this.availableInstruments[name].getInstance( id, device );
    };
}]);
/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('keyboard',[]).directive('keyboard',['$compile', '$window','$rootScope','keyboardHelperService',function($compile, $window, $rootScope,keyboardHelperService){


    return {
        restrict : 'E',
        scope : {
            octave : '=',
            octaves : '='
        },
        link : function ($scope,element) {
            var vm = $scope;
            vm.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            vm.notesGenerated = [];
            //console.log(vm.octaves);
            //vm.notes.forEach(function(v){
            for ( var  o = 0 ; o < vm.octaves ; o++ ) {
                //vm.notes[i] = v + o;
                //console.log(v + "" + o);
                vm.notesGenerated = vm.notesGenerated.concat(vm.notes);
            };
            var octaveCounter = vm.octave;
            vm.notesGenerated.forEach(function(v, i){
                vm.notesGenerated[i] += octaveCounter;
                console.log((i+1) % 12)
                if ( (i+1) % 12 == 0 && i != 0 ) {
                    octaveCounter++;
                }
            });
            //});

            //vm.notesGenerated.sort(function (a, b) {
            //    var aNote = (a.split('#')[1]) ? a.split('#')[0]: a.split("")[0];
            //    var aOctave = (a.split('#')[1]) ? a.split('#')[1]: a.split("")[1];
            //    var aHash = (a.split('#')[1]) ? aNote + "#" : aNote;
            //    var bNote = (b.split('#')[1]) ? b.split('#')[0]: b.split("")[0];
            //    var bOctave = (b.split('#')[1]) ? b.split('#')[1]: b.split("")[1];
            //    var bHash = (b.split('#')[1]) ? bNote + "#" : bNote;
            //
            //    if ( aOctave > bOctave ) {
            //        if ( vm.notes.indexOf(aHash) > vm.notes.indexOf(bHash) ) {
            //            return 1;
            //        }
            //    } else if ( a === b) {
            //        return 0;
            //    } else {
            //        if ( vm.notes.indexOf(aHash) > vm.notes.indexOf(bHash) ) {
            //            return 1;
            //        }
            //    }
            //    return -1;
            //});
            console.log(vm.notesGenerated);
            vm.getClass = function ( note ) {
                //console.log([ vm.notes[note], ]);
                return {
                    black : (vm.notesGenerated[note].split('#')[1]),
                    white : (!vm.notesGenerated[note].split('#')[1]),
                    key : true
                };
            };
            //$rootScope.$on('keyDown', function(e){
            //    console.log(e);
            //});
            //angular.element($window).on('keyUp', function(){
            //
            //});
            vm.activeNotes = [];

            vm.keyDown = function (note, freq) {
                var device = keyboardHelperService.getKeyboardUser();
                device.instrument_instance.play(freq);
            };
            vm.keyUp = function (note, freq) {
                var device = keyboardHelperService.getKeyboardUser();
                device.instrument_instance.stop(freq);
            };

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
    var listeners = [];
    var mouse_is_down = false,
        keysDown = {},
        key_map = {
            65: 'Cl',
            87: 'C#l',
            83: 'Dl',
            69: 'D#l',
            68: 'El',
            70: 'Fl',
            84: 'F#l',
            71: 'Gl',
            89: 'G#l',
            90: 'G#l',
            72: 'Al',
            85: 'A#l',
            74: 'Bl',
            75: 'Cu',
            79: 'C#u',
            76: 'Du',
            80: 'D#u',
            59: 'Eu',
            186: 'Eu',
            222: 'Fu',
            221: 'F#u',
            220: 'Gu'
        };
    return {
        getFrequencyOfNote : function (note) {
            var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
                key_number,
                octave;

            if (note.length === 3) {
                octave = note.charAt(2);
            } else {
                octave = note.charAt(1);
            }
            key_number = notes.indexOf(note.slice(0, -1));

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
            callback(note, this.getFrequencyOfNote(note));
        },
        mouseup : function (e, callback) {
            var el = angular.element(e.target);
            var note = el.data().$scope.note;
            callback(note, this.getFrequencyOfNote(note));
        },
        register : function (cb) {
            listeners.push(cb);
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

.factory("midiHandlerService", ['$window', 'requestMIDIAccess', '$q', '$rootScope',function($window, requestMIDIAccess, $q, $rootScope){
    var val = 0;
    var val1 = 0;
    var val2 = 0;
    var devices = [];
    var getIODevices = function () {
        var access = requestMIDIAccess.requestAccess();
        access.then(function (access){
            access.inputs.forEach(function ( i ) {
                devices.push({
                    device : null,
                    midi : i
                });
            });
            service.devices = devices;
        });
    };

    var note = function (note) {
        var notes = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'],
            key_number,
            octave;

        if (note.length === 3) {
            octave = note.charAt(2);
        } else {
            octave = note.charAt(1);
        }
        key_number = notes.indexOf(note.slice(0, -1));

        if (key_number < 3) {
            key_number = key_number + 12 + ((octave - 1) * 12) + 1;
        } else {
            key_number = key_number + ((octave - 1) * 12) + 1;
        }

        return 440 * Math.pow(2, (key_number - 49) / 12);
    }

    var onMessage = function (e, user) {
        console.log(e, user);
            service.val1 = e.data[1];
            service.val2 = e.data[2];
            service.val = e.data[0];
        if ( e.data[0] == 147 ) {
            user.instrument_instance.play((440 * Math.pow(2, (e.data[1] - 69) / 12)));
        } else if ( e.data[0] == 131 ) {
            user.instrument_instance.stop((440 * Math.pow(2, (e.data[1] - 69) / 12)));
        }
    };


    var sendMessage = function () {

    };
    var connect = function (device, user) {
        if ( device && user ) {
            var d = findDevice(device);
            if ( d ) {
                if ( d.user ) {
                    console.log("Device is currently used by another instrument");
                } else {
                    d.user = user;
                    d.midi.onmidimessage = function (e) {
                        onMessage(e, user);
                    };
                }
            } else console.log("cant find dev");
        } else console.log("empty stuff");

    };
    var disconnect = function ( device ) {
        device.user = null;
    }
    var findDevice = function ( device ) {
        var result = null;
        devices.some(function ( d ) {

            if ( d.midi.id == device.midi.id  ) {
                //console.log(d.midi.id, device.midi.id);
                result = d;
                return true;
            }
        });
        return result;
    };
    var service = {
        get devices() {
          return devices;
        },
        set devices(a){
            devices = a;
            //$rootScope.$apply();
        },
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
        getDevices : getIODevices,
        connectDevice : connect
    };
return service;
}]).controller('midiHandlerController', ['$scope', 'midiHandlerService', 'devicesService',function($scope, midiHandlerService, devicesService){
    midiHandlerService.getDevices();
    $scope.m = midiHandlerService;
    $scope.devices = $scope.m.devices;


    $scope.$watch('activeDevice', function(n){
        midiHandlerService.connectDevice(n,devicesService.get("anothersquaresynth"))
    });
}]);
angular.module('Sequencer',['Devices', 'keyboard']).
controller('sequencerController', [function(){
    //var vm = $scope;
}])
.factory('sequencerService', ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx','$q', function(devices, keyboard, $timeout, $interval, worker, ctx, $q){
    var Scheduler = function () {
        this.BPM = 60;
        this.beatLen = 60/this.BPM; // 60 seconds multiplied by BPM
        this.devices = devices.getAll();
        this.nextNoteIndex = 0;
        this.allTracks = [];
        this.lookahead = 0.02; // seconds
        this.interval = 25; // milliseconds
        this.nextNoteTime;
        this.promise = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.startTime = null;

        this.init();
    };

    Scheduler.prototype.getTracks = function () {
            var defered = $q.defer();
            var tmp = [];
            // Fetch all tracks
            defered.notify("about to update tracks");
            this.devices.forEach(function(device) {
                if (device.enabled){
                // Save to temporary array for comparison
                    tmp = tmp.concat(device.notes);
                }
            });
            // compare new track to current one
            var unique = tmp.concat(this.allTracks).filter(function() {
                var seen = {};
                return function(element, index, array) {
                    return !( element.start+element.end+element.note in seen) && (seen[element.start+element.end+element.note] = 1);
                };
            }());
            // If no changes found terminate function
            //console.log([unique.length, this.allTracks.length, tmp]);

            if ( unique.length == this.allTracks.length ) {
                defered.resolve({message : "no changes found"});
            } else {
                // otherwise update track list
                console.log("please wait...");
                this.allTracks = angular.copy(tmp);
                //this.allTracks.sort(sortNotes);
                defered.resolve({message : "Sort complete"});
            }
        return defered.promise;
    };

    Scheduler.prototype.play = function (stop) {

        if ( stop ) {
            worker.stop();
            this.isPlaying = false;
            return false;
        }
        var updateTracks = this.getTracks();
        var self = this;
        updateTracks.then(function(res){
            //console.log(self.calculateNoteTiming(self.allTracks[self.allTracks.length-1]));
            console.log(res.message);
            self.isPlaying = !self.isPlaying;
            if ( self.isPlaying ) {
                worker.start();
                self.nextNoteTime = self.calculateNoteTiming(self.allTracks[self.nextNoteIndex]).time.start + ctx.currentTime;

                console.log(self.nextNoteTime, ctx.currentTime);
                //self.startTime =
            } else {
                worker.stop();
                //console.log(self.devices);
                self.devices.forEach(function(d){
                    //console.log(d.instrument_instance);
                    d.instrument_instance.stopAll();
                });
                self.startTime = null;
            }
        });
    };

    Scheduler.prototype.getCurrentTime = function () {
        return this.currentTime;
    }

    Scheduler.prototype.init = function () {
        var self = this;
        worker.worker.onmessage = function (e) {
            if ( e.data == "tick" ) {
                self.schedule();
            } else {
                console.log({"message" : e.data});
            }
        };
        worker.worker.postMessage({"interval" : this.interval});
    };

    Scheduler.prototype.scheduleNote = function ( note ) {
        var device = devices.get(note.target);
        device.instrument_instance.play(this.nextNoteTime, this.nextNoteTime + note.time.end,note.velocity, keyboard.getFrequencyOfNote(note.note));
        console.log("scheduleNote()",this.nextNoteTime);

        //this.nextNoteIndex++;
    };

    Scheduler.prototype.nextNote = function(returnNote){
        //var ct = ctx.currentTime;
        //if ( this.nextNoteIndex >= this.allTracks.length ) return false;
        //var next = this.calculateNoteTiming(this.allTracks[this.nextNoteIndex]);
        //if ( returnNote ){
        //    next.time.end += ct;
        //    next.time.start += ct
        //    return next;
        //}
        //
        //var lookahead = ct + this.lookahead;
        //if ( ( next.time.start  < lookahead) && this.nextNoteIndex < this.allTracks.length ) {
        //    console.log(true,(next.time.start+ct), lookahead, this.startTime);
        //    return true;
        //} else {
        //    console.log(false,(next.time.start+ct), lookahead);
        //    return false;
        //
        //}
        this.nextNoteIndex++;
        var nn = this.calculateNoteTiming(this.allTracks[this.nextNoteIndex]);
        var pn = this.calculateNoteTiming(this.allTracks[this.nextNoteIndex-1]);
        this.nextNoteTime += nn.time.start - pn.time.start;
        console.log('nextNote()',this.nextNoteTime, this.nextNoteIndex, nn,pn);
    };

    Scheduler.prototype.increaseTimer = function(){
        var deferred = new $q.defer();
        this.currentTime += this.interval;
        deferred.resolve("done");
        return deferred.promise;
    };

    Scheduler.prototype.schedule = function () {
        console.log("schedulin");

        //var updateTracks = this.getTracks();
        //updateTracks.then(function (r){
        var self = this;
        this.increaseTimer().then(function(){
            self.getCurrentTime();
        });
        //console.log(this.currentTime);
            while ( this.nextNoteTime < ctx.currentTime + this.lookahead && this.nextNoteIndex < this.allTracks.length ) {

                console.log("loopin");
                //console.log(ctx.currentTime);
                this.scheduleNote(this.calculateNoteTiming(this.allTracks[this.nextNoteIndex]));
                this.nextNote();
                //if ( this.nextNoteIndex >= this.allTracks.length ) this.play(true);
            }
        if ( this.nextNoteIndex >= this.allTracks.length ) {
            this.play(true);
            this.nextNoteIndex = 0;
            this.currentTime = 0;
        };
        //});
    };
    var sortNotes = function (a, b) {

        var astart  = breakNoteCoordinates(a.start);
        var bstart  = breakNoteCoordinates(b.start);

        if ( astart['bar'] > bstart['bar'] ) {
            return 1;
        } else if ( astart['bar'] == bstart['bar'] ) {
            if ( astart['beat'] == bstart['beat'] ) {
                if ( astart['eighth'] == bstart['eighth'] ) {
                    return 0;
                } else if ( astart['eighth'] > bstart['eighth'] ) {
                    return 1;
                } else {
                    return -1;
                }
            } else if ( astart['quarter'] > bstart['quarter'] ) {
                return 1;
            } else {
                return -1;
            }
        } else {
            return -1;
        }
    };

    var breakNoteCoordinates = function (coords) {
        var brake = coords.split(".");
        //console.log(brake);
        return {
            bar    : parseInt(brake[0]),
            beat    : parseInt(brake[2]),
            eighth  : parseInt(brake[1])
        };
    };

    Scheduler.prototype.noteLength = function ( type ) {
        switch ( type ) {
            case "bar"      : return this.beatLen*4; // Length of a bar (4 quarter notes)
            case "beat"  : return this.beatLen; // Length of a beat  (1 quarter note)
            case "eighth"   : return (this.beatLen/2); // Length of a sixteenth note ( 1/8 of a quarter note)
            default: return false;
        }
    };

    Scheduler.prototype.calculateNoteTiming = function (note) {
        var start = breakNoteCoordinates(note.start);
        var end = breakNoteCoordinates(note.end);
    //console.log(start,end);
        var noteStartTime =
            ( start.bar * this.noteLength("bar")) +
            ( start.beat * this.noteLength("beat") ) +
            ( start.eighth * this.noteLength("eighth") );
        var noteEndTime =
            ( end.bar * this.noteLength("bar")) +
            ( end.beat * this.noteLength("beat") ) +
            ( end.eighth * this.noteLength("eighth") );
        note.time = {
            start  : noteStartTime,
            end    : noteEndTime
        };
        return note;
    };
    return {
        getScheduler : function () {
            return new Scheduler();
        }
    };

    //var play = function () {
    //
    //    this.devices.forEach(function(device){
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
    //this.stop = function (){
    //    var ap = AudioParam.cancelScheduledValues(ctx.currentTime);
    //}

}])
.service('sequencerWorkerService', [function () {
    var SequencerWorker = function (  ) {
        this.worker = new Worker('app/components/sequencer/sequencerWorker.js');
    };
    SequencerWorker.prototype.stop = function () {
        this.worker.postMessage("stop");
    };
    SequencerWorker.prototype.start = function () {
        this.worker.postMessage("start");
    };
    SequencerWorker.prototype.changeInterval = function ( lookaheadTime ) {
        this.worker.postMessage({"interval" : lookaheadTime});
    };

    return new SequencerWorker();
}])
.controller('schedulerController',['sequencerService','$scope',function(sequencer, $scope){
    var self = $scope;
    self.sequencer = sequencer.getScheduler();
    console.log(self.sequencer);
    self.play = function () {
        self.sequencer.play();
    };
    self.shit = function (){
        self.currentTime = self.sequencer.getCurrentTime();
    };
    self.currentTime;
    self.$watch('sequencer.currentTime', function (n, o){
        //console.log(n,o);
        //self.currentTime = n;
    });
}])
.service('notesFactory', [function() {
    return {

    }
}]);

/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('anotherSynth', []).
service('anotherSynth', ['audioCtx', function(audioCtx){
    var Instrument = function ( id, device ) {
        this.name = "AnotherSynth";
        this.id = "another_synth"
        this.params = {
            id : id,
            gain : 0.5,
            output : device.gainNode,
            device : device,
            input : null
        };
        this.gainNode = audioCtx.createGain();
        this.type = "sine";
        this.gainNode.connect(this.params.output);
        this.chords = [];
        this.gainNode.gain.value = this.params.gain;
    };

    Instrument.prototype.changeVolume = function() {
        this.gainNode.gain.value = this.params.gain;
    };

    Instrument.prototype.play = function(start, end,velocity, freq) {

        oscillatorNode = audioCtx.createOscillator();

        oscillatorNode.connect(this.gainNode);

        oscillatorNode.frequency.value = freq;
        oscillatorNode.type = this.type;
        console.log(velocity);
        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);

        oscillatorNode.start(audioCtx.currentTime + start);
        oscillatorNode.stop(audioCtx.currentTime + end);
        //this.chords.push(oscillatorNode);
        //return oscillatorNode;
    };

    Instrument.prototype.stopAll = function () {
        for ( var i = 0 ; i < this.chords.length ; i++ ) {
            this.chords[i].stop(0);
        }
    };

    Instrument.prototype.stop = function(frequency) {
        var new_chords = [];
        for ( var i = 0 ; i < this.chords.length ; i++ ) {
            if ( Math.round(this.chords[i].frequency.value) === Math.round(frequency) ) {
                this.chords[i].stop(0);
                this.chords[i].disconnect();
            } else {
                new_chords.push(this.chords[i]);
            }
        }
        this.chords = new_chords;
    };
    return {
        getInstance : function ( id, device ) {
            return new Instrument( id, device );
        }
    };
}]);
/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('simpleSynth', []).
service('simpleSynth', ['audioCtx','masterGain', function(audioCtx){
    var Instrument = function ( id, device ) {
        this.name = "SimpleSynth";
        this.id = "simple_synth";
        this.params = {
            id : id,
            gain : 1,
            output : device.gainNode,
            device : device,
            input : null
        };
        this.gainNode = audioCtx.createGain();
        this.type = "square";
        this.gainNode.connect(this.params.output);
        this.chords = [];
        this.gainNode.gain.value = this.params.gain;
    };

    Instrument.prototype.changeVolume = function() {
        this.gainNode.gain.value = this.params.gain;
    };

    Instrument.prototype.play = function(freq) {

        oscillatorNode = audioCtx.createOscillator();

        oscillatorNode.connect(this.gainNode);

        oscillatorNode.frequency.value = freq;
        oscillatorNode.type = this.type;
        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
        oscillatorNode.start(0);
        //oscillatorNode.stop(end);
        this.chords.push(oscillatorNode);
        return oscillatorNode;
    };

    Instrument.prototype.stopAll = function () {
        for ( var i = 0 ; i < this.chords.length ; i++ ) {
            this.chords[i].stop(0);
        }
    };

    Instrument.prototype.stop = function(frequency) {
        var new_chords = [];
        for ( var i = 0 ; i < this.chords.length ; i++ ) {
            if ( Math.round(this.chords[i].frequency.value) === Math.round(frequency) ) {
                this.chords[i].stop(0);
                this.chords[i].disconnect();
            } else {
                new_chords.push(this.chords[i]);
            }
        }
        this.chords = new_chords;
    };
    return {
        getInstance : function ( id, device ) {
            return new Instrument( id, device );
        }
    };
}]);
