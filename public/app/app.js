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
