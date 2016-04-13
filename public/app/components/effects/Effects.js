/**
 * Created by Haroldas Latonas on 4/10/2016.
 */

/*
Effects module
desc    : responsible for creating new instances of effect classes
          Effect routing etc.
 */
angular.module('Effects', ['filterEffect', 'delayEffect', 'visualizationEffect', 'reverbEffect']).
    /*
factory : effectsService
desc    : Contains functionality to load an effect, performs effect audio routing
          and hold a list of available effects
 */
factory('effectsService',['filter', 'visualization', 'reverb', function(f, viz, reverb){
    var effectsList = [
        {
            name    : 'Filter',
            id      : 'filter',
            effect  : f
        },
        {
            name    : 'Visualization',
            id      : 'visualization',
            effect  : viz
        },
        {
            name    : 'Reverb',
            id      : 'reverb',
            effect  : reverb
        }
    ];
    /*
    Find desired effect
    args    : id - id of effect
    returns : reference to effect class
     */
    var find = function (id) {
        for ( var i = 0 ; i < effectsList.length ; i++ ) {
            if ( effectsList[i].id == id ) {
                return effectsList[i];
            }
        }
        return null;
    };
    return {
        // Get list of effects
        get effectsList () {
            return effectsList;
        },
        /*
        Loads effect into effects chain,performs routing and return reference to effect for view
        args    : id - id of effect
                  device - reference to device object
        return  : Reference to effect object
         */
        load : function (id, device) {
            var e = find(id);
            // Create effect object
            var effect = new e.effect();

            if ( device.effects_chain.length > 0 ) {  // Does effect chain contain any effects
                // get last effect inside effects chain
                var lastEffect = device.effects_chain[device.effects_chain.length-1];
                // Disconnect last effect from Device gain node
                lastEffect.params.output.disconnect();
                // Connect new effect to last effect's output
                effect.input = lastEffect.params.output;
            } else {// Effects chain is empty
                // Disconnect instrument from device gain node
                device.instrument_instance.params.output.disconnect();
                // Connect new effect with instrument's output
                effect.input = device.instrument_instance.params.output;
            }
            // Connect new effect with Device's gain node
            effect.output = device.gainNode ;
            // Fire effect initialization
            effect.init();
            // Add new effect into the end of effects chain
            device.effects_chain.push(effect);
            // Return reference to new effect
            return effect;
        },
        /*
        Disconnects and removes effect from effects chain
        args    : effectToDisconnect - reference to effect we want to remove
                  device - reference to Device Object
        return  : void
         */
        disconnectEffect : function ( effectToDisconnect, device ) {
            // Disconnect effect output
            effectToDisconnect.disconnect();
            // Get effect's location inside effects chain
            var index = device.effects_chain.indexOf(effectToDisconnect);
            // rewire effects
            if ( device.effects_chain.length > 1  ) {
                if ( index == 0 ) {
                    // connect effect on the right to instrument
                    device.effects_chain[1].input = device.instrument_instance.params.output;
                } else if ( index == (device.effects_chain.length-1) ) {
                    // connect effect on the left to device gain
                    device.effects_chain[device.effects_chain.length-2].output = device.gainNode;
                } else {
                    // connect left effect together with right effect
                    var leftEffect = device.effects_chain[index-1];
                    var rightEffect = device.effects_chain[index+1];
                    leftEffect.params.output.disconnect();
                    rightEffect.input = leftEffect.params.input;
                }
            } else if ( device.effects_chain.length == 1 ){
                device.instrument_instance.output = device.gainNode;
            }
            if ( index > -1 ) device.effects_chain.splice(index,1);
        }
    }
}])
    /*
    directive   : effectControl
    desc        : Dynamically compiles effect settings partial view
     */
.directive('effectControl', ['effectsService',function(effectsService){
    return {
        restrict : "A",
        scope : {
            // id of effect to compile
            effectControl : '@',
            // boolean flag
            // Are we reinitializing existing effect
            reinitialize : '=',
            // Number
            // Where effect is sitting inside effects list
            sequenceNumber : '='
        },
        link : function ( $scope, $el ) {
            if ( $scope.reinitialize ) { // Reinitializing effect
                // assign effect to local scope
                $scope.effect = $scope.$parent.device.effects_chain[$scope.sequenceNumber];
                // Fire initialization sequence for effect
                $scope.effect.init();
            } else {
                // Load new effect
                $scope.effect = effectsService.load(
                    $scope.effectControl ,
                    $scope.$parent.device
                );
            }
            // Initialize close button for effect's box
            var closeBtn = angular.element('<div class="close"><span class="fa fa-close"></div>');
            // bind click event for close button
            closeBtn.bind('click', function () {
                // when effect is close it get removed from effects chain
                effectsService.disconnectEffect($scope.effect,$scope.$parent.device);
                // Unbind click event to prevent event duplication
                closeBtn.unbind('click');
                // destroy scope
                $scope.$destroy();
                // Remove effect's DOM element
                $el.remove();
            });
            // Add close button to DOM
            $el.prepend(closeBtn);
            // Dynamically fetch effect settings partial view template
            $scope.getTemplate = function () {
                return 'app/components/effects/' + $scope.effectControl + '/view.html';
            };
        },
        template : '<div ng-include="getTemplate()"></div>'
    }
}])
/*
    directive   : addEffect
    desc        : Creates a box with a list of available effects
                  Perform effect's DOM element creation
     */
.directive('addEffect', ['$compile', 'effectsService',function($compile, effectsService){
    return {
        restrict : "A",
        scope : true,
        transclude : true,
        link : function ( $scope, $el ) {
            var childScope;
            $scope.addEffect = function (e) {
                childScope = $scope.$new();
                var es = document.querySelector('.instrument-control-wrapper .instrument-control-outer-wrapper .stack-horizontally:nth-last-child(2)');
                var block = $compile('<div class="stack-horizontally effect" effect-control="' + e.id + '"></div>')(childScope);
                angular.element(es).after(block);
            };

        },
        controller : function ($scope) {
            $scope.effectsList = effectsService.effectsList;
            $scope.instrument = $scope.device.instrument_instance;
        },
        templateUrl : 'app/components/effects/addEffectsDirective.html'
    };
}]);