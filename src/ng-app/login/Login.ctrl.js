(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('LoginCtrl', LoginCtrl);

	LoginCtrl.$inject = ['Fire', '$scope', 'OAUTH', '$rootScope', '$location', 'localData', 'MQ', 'mediaCheck'];

	function LoginCtrl(Fire, $scope, OAUTH, $rootScope, $location, localData, MQ, mediaCheck) {
		// controllerAs ViewModel
		var login = this;

		// Firebase authentication
		var _auth = Fire.auth();

		/**
		 * Local data successfully retrieved
		 *
		 * @param data {json}
		 * @private
		 */
		function _localDataSuccess(data) {
			login.localData = data;
		}
		localData.getJSON().then(_localDataSuccess);

		login.logins = OAUTH.LOGINS;

		/**
		 * Authenticate the user via Oauth with the specified provider
		 *
		 * @param {string} provider - (twitter, facebook, github, google)
		 */
		login.authenticate = function(provider) {
			login.loggingIn = true;

			/**
			 * Successfully authenticated
			 * Go to initially intended authenticated path
			 *
			 * @param response {object} promise response
			 * @private
			 */
			function _authSuccess(response) {
				login.loggingIn = false;

				if ($rootScope.authPath) {
					$location.path($rootScope.authPath);
				} else {
					$location.path('/');
				}
			}

			/**
			 * Failed to authenticate
			 *
			 * @param error
			 * @private
			 */
			function _authError(error) {
				console.log(error.data);
				login.loggingIn = 'error';
				login.loginMsg = ''
			}

			/**
			 * Use popup to log in (large viewport)
			 *
			 * @private
			 */
			function _authWithPopup() {
				_auth.$authWithOAuthPopup(provider)
					.then(_authSuccess)
					.catch(_authError);
			}

			/**
			 * Use redirect to log in (small viewport)
			 *
			 * @private
			 */
			function _authWithRedirect() {
				_auth.$authWithOAuthRedirect(provider, _authError);
			}

			/**
			 * Initialize mediaCheck
			 * When small MQ, redirect with Oauth
			 * When large MQ, log in with Oauth popup
			 */
			mediaCheck.init({
				scope: $scope,
				mq: MQ.SMALL,
				enter: _authWithRedirect,
				exit: _authWithPopup
			});
		};
	}
})();