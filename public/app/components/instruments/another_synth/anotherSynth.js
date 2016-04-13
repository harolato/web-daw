/**
 * Created by 12059_000 on 12/9/2015.
 */
angular.module('anotherSynth', [])
    .factory('anotherSynth', ['audioCtx','$rootScope', function(audioCtx, $rootScope){
        var name = "Another Synth";
        var id = "another_synth";
        var params = {
            gain : 0.5,
            output : audioCtx.createGain(),
            synthTypes : ['square', 'sine', 'triangle','sawtooth'],
            osc1 : {
                enabled : true,
                synthType : 'square',
                octave : 0
            },
            osc2 : {
                enabled : true,
                synthType : 'sine',
                octave : -2
            }
        };
        var activeNotes = [];


        var initOscillators = function (freq) {
            var oscillators = {
                freq : freq,
                osc : []
            };
            if ( params.osc1.enabled ) {
                osc1 = audioCtx.createOscillator();

                osc1.connect(params.gainNode);
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
                osc1.start(0);
                oscillators.osc.push(osc1);
            }
            if ( params.osc2.enabled ) {
                osc2 = audioCtx.createOscillator();

                osc2.connect(params.gainNode);
                for ( var i = 0 ; i < Math.abs(params.osc2.octave) ; i++ ) {
                    if ( params.osc2.octave < 0 ) {
                        freq -= freq/2;
                    } else if ( params.osc2.octave > 0) {
                        freq += freq*2;
                    }
                }
                osc2.frequency.value = freq ;
                osc2.type = params.osc2.synthType;
                //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
                osc2.start(0);
                oscillators.osc.push(osc2);
            }
            return oscillators;
        };


        var play = function(freq) {
            var osc = initOscillators(freq);
            activeNotes.push(osc);
        };

        var stopAll = function () {
            for ( var i = 0 ; i < activeNotes.length ; i++ ) {
                activeNotes[i].stop(0);
            }
        };

        var stop = function(frequency) {
            var newNotes = [];
            for ( var i = 0 ; i < activeNotes.length ; i++ ) {
                if ( Math.round(activeNotes[i].freq) === Math.round(frequency) ) {
                    activeNotes[i].osc.forEach(function(o){
                        o.stop(0);
                        o.disconnect();
                    });
                } else {
                    newNotes.push(activeNotes[i]);
                }
            }
            activeNotes = newNotes;
        };
        return {
            get id(){
                return id;
            },
            set volume(a) {
                params.gain = a;
                gainNode.gain.value = params.gain;
            },
            get volume() {
                return params.gain;
            },
            get params(){
                return params;
            },
            play : play,
            stop : stop,
            set output(a) {
                params.output = gainNode.connect(a);
                gainNode.connect(a);
            }
        };
    }]);
//.service('simpleSynth', ['audioCtx','masterGain', function(audioCtx){
//    var Instrument = function ( id, device ) {
//        this.name = "SimpleSynth";
//        this.id = "simple_synth";
//        this.params = {
//            id : id,
//            gain : 0.5,
//            output : device.gainNode,
//            device : device,
//            input : null
//        };
//
//        this.gainNode = audioCtx.createGain();
//        this.type = "square";
//        this.gainNode.connect(this.params.output);
//        this.chords = [];
//        this.gainNode.gain.value = this.params.gain;
//    };
//
//    Instrument.prototype.changeVolume = function() {
//        this.gainNode.gain.value = this.params.gain;
//    };
//
//    Instrument.prototype.play = function(freq) {
//
//        oscillatorNode = audioCtx.createOscillator();
//
//        oscillatorNode.connect(this.gainNode);
//
//        oscillatorNode.frequency.value = freq;
//        oscillatorNode.type = this.type;
//        //this.params.device.gainNode.gain.setValueAtTime(velocity, audioCtx.currentTime + start);
//        oscillatorNode.start(0);
//        //oscillatorNode.stop(end);
//        this.chords.push(oscillatorNode);
//        return oscillatorNode;
//    };
//
//    Instrument.prototype.stopAll = function () {
//        for ( var i = 0 ; i < this.chords.length ; i++ ) {
//            this.chords[i].stop(0);
//        }
//    };
//
//    Instrument.prototype.stop = function(frequency) {
//        var new_chords = [];
//        for ( var i = 0 ; i < this.chords.length ; i++ ) {
//            if ( Math.round(this.chords[i].frequency.value) === Math.round(frequency) ) {
//                this.chords[i].stop(0);
//                this.chords[i].disconnect();
//            } else {
//                new_chords.push(this.chords[i]);
//            }
//        }
//        this.chords = new_chords;
//    };
//    return {
//        getInstance : function ( id, device ) {
//            return new Instrument( id, device );
//        }
//    };
//}]);