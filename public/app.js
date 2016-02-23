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

angular.module('waw', [ 'Devices', 'Instruments', 'keyboard', 'Sequencer']).
controller('mainController',['$scope', 'sequencerService', function($scope, sequencer){
    var vm = this;
    vm.message = "WAW v2";

    vm.play = function () {
        sequencer.play();
    };
    vm.stop = function () {
        sequencer.stop();
    };
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
        var ctx = {};
        var AudioContext = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioContext();
        console.log(ctx);
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
        template : '<p>Preview of current notes</p>'
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
        scope : true,
        link : function (scope, element, attributes) {

        },
        controller : function ($scope, $element) {
            var vm = $scope;

            vm.params = {
                gain : 0.7
            };
            // Initialize device object for data binding
            var o = devicesService.add($element.attr('data-id'),vm);
            vm.device = o;


            vm.device.enabled = $element.attr('data-enabled');

            //vm.device.instrument_instance = instrumentsService.load('simpleSynth', audioCtx, masterGain, vm.device);
            vm.volumeSlider = sliderHelper.getSlider(vm.device);
            vm.device.instrument_instance = InstrumentsService.getInstrument($element.attr('data-instrument'), vm.device);
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

            var instance = vm.device;
            function randomNumber(min, max, incl) {
                incl = (incl) ? 1 : 0;
                return Math.floor(Math.random() * ( max - min + incl )) + min;
            }
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
                        end     : "0.1.0",
                        note    : "G4",
                        velocity: 1  // Velocity indicated note volume
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.2.0",
                        end     : "0.3.0",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/8 E    2nd quarter note. 1/8+1/8 = 1/4
                        target  : instance,
                        start   : "0.0.1",
                        end     : "0.1.1",
                        note    : "E4",
                        velocity: 1
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "0.2.1",
                        end     : "0.3.1",
                        note    : "C4",
                        velocity: 1
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.0.2",
                        end     : "0.1.2",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/8 G
                        target  : instance,
                        start   : "0.2.2",
                        end     : "0.3.2",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/8 E
                        target  : instance,
                        start   : "0.0.3",
                        end     : "0.1.3",
                        note    : "E4",
                        velocity: 1
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "0.2.3",
                        end     : "0.3.3",
                        note    : "C4",
                        velocity: 1
                    },
                    {// 1/8 F   2nd bar beginning
                        target  : instance,
                        start   : "1.0.0",
                        end     : "1.1.0",
                        note    : "F4",
                        velocity: 1
                    },
                    {// 1/8 A
                        target  : instance,
                        start   : "1.2.0",
                        end     : "1.3.0",
                        note    : "A4",
                        velocity: 1
                    },
                    {// 1/8 C
                        target  : instance,
                        start   : "1.0.1",
                        end     : "1.1.1",
                        note    : "C5",
                        velocity: 1
                    },
                    {// 1/8 A
                        target  : instance,
                        start   : "1.2.1",
                        end     : "1.3.1",
                        note    : "A4",
                        velocity: 1
                    },
                    {// 1/4 G
                        target  : instance,
                        start   : "1.0.2",
                        end     : "1.3.2",
                        note    : "G4",
                        velocity: 1
                    },
                    {// 1/4 G
                        target  : instance,
                        start   : "1.0.3",
                        end     : "1.3.3",
                        note    : "G4",
                        velocity: 1
                    }];
            }


            this.scope = vm;
        },
        templateUrl : 'app/components/device/view.html'
        }
}).
service('devicesService',['utilitiesService','keyboardHelperService','audioCtx', function(utilitiesService, keyboardHelperService, audioCtx) {
    this.list = [];
    var notes = [
        {
            start   : "0.0.0",
            end     : "0.0.1",
            note    : "G5",
            velocity: 1
        },
        {
            start   : "0.0.1",
            end     : "0.0.2",
            note    : "G3",
            velocity: 1
        },
        {
            start   : "0.0.2",
            end     : "0.0.3",
            note    : "E3",
            velocity: 1
        },
        {
            start   : "0.0.3",
            end     : "0.0.4",
            note    : "C5",
            velocity: 1
        },
        //{
        //    start   : "5.2.2",
        //    end     : "6.1.4",
        //    note    : "C3",
        //    velocity: 1
        //}
    ];


    function randomNumber(min, max, incl) {
        incl = (incl) ? 1 : 0;
        return Math.floor(Math.random() * ( max - min + incl )) + min;
    }

    var genNotes = function ( device ) {
        var i;
        var notes = [];
        var letters = ["C","D","E","F","G","A","B"];
        for ( i = 0; i < 100 ; i++) {
            var bar = randomNumber(0,50, true);
            var qt = randomNumber(0,3, true);
            var eighth = randomNumber(0,3, true);
            var start = bar + "." + qt + "." + eighth;
            var end = randomNumber(bar,bar + randomNumber(0,1), true) + "." + randomNumber(qt,3, true) + "." + randomNumber(eighth,3, true);
            notes.push({
                target  : device,
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
            notes :null,
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
            if ( id === allDevices[i].id ) {
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
angular.module('Instruments',['simpleSynth', 'anotherSynth']).

controller('InstrumentsController', ['InstrumentsService', 'utilitiesService', function (InstrumentsService, utilitiesService) {
    var vm = this;
    vm.instruments = InstrumentsService;
    //console.log(vm.instruments);
    vm.crack = 1;
}]).
service('InstrumentsService',['simpleSynth', 'anotherSynth','utilitiesService', function(simpleSynth, anotherSynth, utilitiesService){
    this.availableInstruments = {
        "simple synthesizer" : simpleSynth,
        "Another synthesizer" : anotherSynth
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
            octave : '='
        },
        link : function ($scope,element,attributes) {
            var vm = $scope;
            vm.notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
            vm.notes.forEach(function(v, i){
                vm.notes[i] = v + vm.octave;
            });
            vm.getClass = function ( note ) {
                //console.log([ vm.notes[note], ]);
                return {
                    black : (vm.notes[note].split('#')[1]),
                    white : (!vm.notes[note].split('#')[1]),
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
angular.module('Sequencer',['Devices', 'keyboard']).
controller('sequencerController', [function(){
    //var vm = $scope;
}])
.service('sequencerService', ['devicesService', 'keyboardHelperService','$timeout','$interval', 'sequencerWorkerService','audioCtx', function(devices, keyboard, $timeout, $interval, worker, ctx){
    this.devices = devices.getAll();

    var BPM = 10;
    var beatLen = 60/BPM;

    var playOsc = function (start, end, freq) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        var freq = keyboard.getFrequencyOfNote(freq);
        osc.frequency.value = freq;

        osc.start(start);
        osc.stop(end);
    };

    var sortNotes = function (a, b) {

        var astart  = breakNoteCoordinates(a.start);
        var bstart  = breakNoteCoordinates(b.start);

        if ( astart['bar'] > bstart['bar'] ) {
            return 1;
        } else if ( astart['bar'] == bstart['bar'] ) {
            if ( astart['quarter'] == bstart['quarter'] ) {
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
            return -1
        }
    };

    var breakNoteCoordinates = function (coords) {
        var brake = coords.split(".");
        return {
            bar     : parseInt(brake[0]*1),
            quarter : parseInt(brake[2]*1),
            eighth  : parseInt(brake[1]*1)
        };
    };

    var noteLength = function ( type ) {
        switch ( type ) {
            case "bar"      : return beatLen;
            case "quarter"  : return beatLen/4;
            case "eighth"   : return ((beatLen/4)/4);
            default: return false;
        }
    };

    var calculateNoteTiming = function (note) {
        var start = breakNoteCoordinates(note.start);
        var end = breakNoteCoordinates(note.end);

        var noteStartTime =
            ( start['bar'] * noteLength("bar")) +
            ( start['quarter'] * noteLength("quarter") ) +
            ( start['eighth'] * noteLength("eighth") );
        var noteEndTime =
            ( end['bar'] * noteLength("bar")) +
            ( end['quarter'] * noteLength("quarter") ) +
            ( end['eighth'] * noteLength("eighth") );
        return {
            start  : noteStartTime,
            end    : noteEndTime
        };
    };

    var nextNote = function () {

    };



    this.play = function () {
        var allTracks = [];
        this.devices.forEach(function(device){
            var device = device;
            if ( device.enabled ) {
                //device.notes.sort(sortNotes);
                //console.log(device.notes);
                allTracks = allTracks.concat(device.notes);

                //console.log({
                //    "Starts at:" : calculateNoteTiming(device.notes[0]),
                //    "Ends at:" : calculateNoteTiming(device.notes[device.notes.length-1])
                //});

                //device.notes.forEach(function(note){
                //
                //    var timing = calculateNoteTiming(note);
                //
                //    playOsc(timing.start, timing.end, note.note);
                //    //console.log([
                //    //    {
                //    //        start   : timing.start,
                //    //        end     : timing.end,
                //    //        note    : note.note
                //    //    }
                //    //]);
                //});
            }
        });


        allTracks.sort(sortNotes);
        allTracks.forEach(function( note ){
            var timing = calculateNoteTiming(note);
            //console.log(note.target);
            note.target.instrument_instance.play(timing.start, timing.end,note.velocity, keyboard.getFrequencyOfNote(note.note));
        });
        //console.log(allTracks);

    };
    this.stop = function (){
        var ap = AudioParam.cancelScheduledValues(ctx.currentTime);
    }

}])
.service('sequencerWorkerService', [function () {
    var SequencerWorker = function (  ) {
        this.worker = new Worker('app/components/sequencer/sequencerWorker.js');
        this.worker.onerror = function (e) {
            console.log(e);
        };
        this.worker.onmessage = function (e) {
            console.log(e);
        };
        this.worker.postMessage({"interval": 100});
    };
    SequencerWorker.prototype.stop = function () {
        this.worker.postMessage("stop");
    };
    SequencerWorker.prototype.start = function () {
        this.worker.postMessage("start");
    };
    SequencerWorker.prototype.changeInterval = function ( lookaheadTime ) {
        this.worker.postMessage({"interval" : lookaheadTime});
    }

    return new SequencerWorker();
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

    Instrument.prototype.play = function(start, end,velocity, freq) {

        oscillatorNode = audioCtx.createOscillator();

        oscillatorNode.connect(this.gainNode);

        oscillatorNode.frequency.value = freq;
        oscillatorNode.type = this.type;
        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);

        oscillatorNode.start(audioCtx.currentTime + start);
        oscillatorNode.stop(audioCtx.currentTime + end);
        //this.chords.push(oscillatorNode);
        //return oscillatorNode;
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