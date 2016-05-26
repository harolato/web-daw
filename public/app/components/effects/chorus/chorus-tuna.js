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
