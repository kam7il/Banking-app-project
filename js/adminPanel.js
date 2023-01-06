//MOJE
app.controller('AdminPanel', [ '$http', '$location', 'globals', 'common' , function($http, $location, globals, common) {
    var ctrl = this;
    ctrl.accounts = null;
    ctrl.role='all'
    ctrl.active='all';
    ctrl.filter='';

    ctrl.edit = function(id, activeVal, workerVal, index, whatToEdit) {
        var obj;

        if(whatToEdit === 'active') {
            obj={active: !activeVal, isAdmin: workerVal};
        } else if(whatToEdit === 'role') {
            obj={isAdmin: !workerVal, active: activeVal};
        }

        $http.post(`/accounts?id=${id}`, obj).then(
            function(rep) {
                ctrl.accounts[index].active = obj.active;
                ctrl.accounts[index].isAdmin = obj.isAdmin;
            },
            function(err) {
                common.showError('Nie udało się zaktualizować danych, spróbuj ponownie później');
            }
        );
    };

    ctrl.refreshData = function() {
        $http.get(`/accounts?filter=${ctrl.filter}&role=${ctrl.role}&active=${ctrl.active}`).then(
            function(rep) {
                ctrl.accounts = ctrl.sortedAccounts = rep.data;
            },
            function(err) {
                common.showError('Nie udało się pobrać danych, odśwież stronę i spróbuj ponownie');
            }
        )
    };

    if(globals.isAdmin !== true) {
        $location.path('/');
    } else {
        ctrl.refreshData();
    };
}]);