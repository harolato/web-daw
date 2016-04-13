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
                console.log('tick');
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