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

    Instrument.prototype.play = function(freq) {

        oscillatorNode = audioCtx.createOscillator();

        oscillatorNode.connect(this.gainNode);

        oscillatorNode.frequency.value = freq;
        oscillatorNode.type = this.type;


        oscillatorNode.start(0);
        this.chords.push(oscillatorNode);
        return oscillatorNode;
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