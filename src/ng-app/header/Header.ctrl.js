(function() {
	'use strict';

	angular
		.module('myApp')
		.controller('HeaderCtrl', headerCtrl);

	headerCtrl.$inject = ['$scope', '$location', 'localData', 'Fire'];

	function headerCtrl($scope, $location, localData, Fire) {
		// controllerAs ViewModel
		var header = this;

		function _localDataSuccess(data) {
			header.localData = data;
		}

		localData.getJSON().then(_localDataSuccess);

		var _auth = Fire.auth();

		_auth.$onAuth(function(authData) {
			header.user = authData;
			header.isAuthenticated = !!header.user;

			if (!header.isAuthenticated) {
				$location.path('login');
			}
		});

		/**
		 * Log the user out of whatever authentication they've signed in with
		 */
		header.logout = function() {
			header.adminUser = undefined;
			_auth.$unauth();
		};

		/**
		 * If user is authenticated and adminUser is undefined,
		 * get the user and set adminUser boolean.
		 *
		 * Do this on first controller load (init, refresh)
		 * and subsequent location changes (ie, catching logout, login, etc).
		 *
		 * @private
		 */
		function _checkUserAdmin() {
			// if user is authenticated and not defined yet, check if they're an admin
			if (header.authData && header.adminUser === undefined) {
				//userData.getUser()
				//	.then(function(data) {
				//		header.adminUser = data.isAdmin;
				//	});
			}
		}
		_checkUserAdmin();
		$scope.$on('$locationChangeSuccess', _checkUserAdmin);

		/**
		 * Currently active nav item when '/' index
		 *
		 * @param {string} path
		 * @returns {boolean}
		 */
		header.indexIsActive = function(path) {
			// path should be '/'
			return $location.path() === path;
		};

		/**
		 * Currently active nav item
		 *
		 * @param {string} path
		 * @returns {boolean}
		 */
		header.navIsActive = function(path) {
			return $location.path().substr(0, path.length) === path;
		};
	}

})();