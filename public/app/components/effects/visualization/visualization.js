/**
 * Created by Haroldas Latonas on 4/10/2016.
 */
/**
 * Resources used to implement functionality for this effect:
 *      https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Visualizations_with_Web_Audio_API
 */
angular.module('visualizationEffect', []).
factory('visualization',['audioCtx','$timeout','$rootScope',function(audioCtx, $timeout, $rootScope){
    var Visualization = (function () {
        var id = "visualization";
        var name = "Visualizations";
        function visualization() {
            var localInputGainNode = audioCtx.createGain();
            var localOutputGainNode = audioCtx.createGain();
            var params = {
                input       : null,
                output      : localOutputGainNode
            };

            var analyser = audioCtx.createAnalyser();

            analyser.fftSize = 2048;
            var bufferl = analyser.fftSize;
            var data = new Uint8Array(bufferl);
            $rootScope.$on("closingSettings", function () {
                console.log("destroyed!!!!!");
            });
            function draw() {

                drawVisual = requestAnimationFrame(draw);

                analyser.getByteTimeDomainData(data);

                canvasCtx.fillStyle = 'rgb(200, 200, 200)';
                canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

                canvasCtx.lineWidth = 2;
                canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

                canvasCtx.beginPath();

                var sliceWidth = WIDTH * 1.0 / bufferl;
                var x = 0;

                for(var i = 0; i < bufferl; i++) {

                    var v = data[i] / 128.0;
                    var y = v * HEIGHT/2;

                    if(i === 0) {
                        canvasCtx.moveTo(x, y);
                    } else {
                        canvasCtx.lineTo(x, y);
                    }

                    x += sliceWidth;
                }

                canvasCtx.lineTo(canvas.width, canvas.height/2);
                canvasCtx.stroke();
            };

            localInputGainNode.connect(analyser);
            localInputGainNode.connect(localOutputGainNode);

            return {
                get id () {
                    return id;
                },
                get name () {
                    return name;
                },
                get params() {
                    return params;
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
                },
                init : function (){
                    $timeout(function() {
                        canvas = document.querySelector('.visualizer');
                        console.log(canvas);
                        canvasCtx = canvas.getContext("2d");
                        WIDTH = canvas.width;
                        HEIGHT = canvas.height;
                        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
                        draw();
                    },2000);
                }
            };
        }
        return visualization;
    })();
    return Visualization;
}]);