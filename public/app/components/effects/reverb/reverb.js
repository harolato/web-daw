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
