app.controller("Transfer", [ '$http', '$scope', '$uibModal', 'common', function($http, $scope, $uibModal, common) {
    var ctrl = this;
    
    ctrl.account = {};
    ctrl.emails = [];
    ctrl.templates = [];

    var initVars = function() {
        ctrl.transaction = { recipient: "", amount: "", description: "" };
    };

    initVars();

    var refreshAccount = function() {
        $http.get('/account').then(function (rep) {
            ctrl.account = rep.data;
        }, function(err) {});
    };

    //MOJE
    var refreshTemplates = function() {
        $http.get('/templates').then(
            function (rep) {
                ctrl.templates = rep.data;
            },
            function(err) {
                ctrl.templates = [];
            }
        )
    }

    refreshAccount();
    refreshTemplates();

    $http.get('/recipients').then(function(rep) {
        ctrl.emails = rep.data;
    }, function(err) {});

    ctrl.doTransfer = function() {
        $http.post('/account', ctrl.transaction).then(
            function (rep) {
                ctrl.account = rep.data;
                common.showMessage('Przelew udany');
                initVars();
            },
            function (err) {
                common.showError('Przelew nieudany, czy odbiorca jest poprawny?');
            }
        );
    };

    //MOJE
    ctrl.useTemplate = function(recipient, amount, description, $event) {
        if($event.target.type !== 'submit') {
            ctrl.transaction.recipient = recipient;
            ctrl.transaction.amount = amount;
            ctrl.transaction.description = description;
        }
    };

    //MOJE
    ctrl.deleteTemplate = function(id, $index) {
        $http.delete(`/templates?id=${id}`).then(
            function(rep) {
                ctrl.templates.splice($index, 1);
            },
            function(err) {
                common.showError('Nie udało się usunąć wzoru, spróbuj ponownie później');
            }
        );
    }

    ctrl.formInvalid = function() {
        return ctrl.transaction.amount <= 0 || ctrl.account.balance - ctrl.transaction.amount < ctrl.account.limit;
    };

    $scope.$on('transfer', function(event, obj) {
        refreshAccount();
    });

    ctrl.openModal = function(templateObj) {
        var modalInstance = $uibModal.open({
            animation: true,
            ariaLabelledBy: 'modal-title-top',
            ariaDescribedBy: 'modal-body-top',
            templateUrl: '/html/transferTemplateDialog.html',
            controller: 'TransferTemplateDialog',
            controllerAs: 'ctrl',
            resolve: {
                emails: function() { return ctrl.emails; },
                templateObj: templateObj
            }
        });
        modalInstance.result.then(
            function() {
                refreshTemplates();
            });
    };

}]);

//MOJE
app.controller("TransferTemplateDialog", [ '$uibModalInstance', '$http', 'common', 'emails', 'templateObj', function($uibModalInstance, $http, common, emails, templateObj) {
    console.log("TransferTemplateDialog start");
    var ctrl = this;
    ctrl.emails = emails;
    
    if(templateObj) {
        ctrl.toEdit = true;
        ctrl.template = { id: templateObj.id, recipient: templateObj.recipient, amount: templateObj.amount, description: templateObj.description };
    } else {
        console.log(templateObj);
        ctrl.toEdit = false;
        ctrl.template = {recipient: '', amount: 0, description: ''};
    }

    ctrl.formInvalid = function() {
        return ctrl.template.amount <= 0 || ctrl.template.recipient === '' || ctrl.template.description === '';
    };

    ctrl.submit = function(toEdit) {
        if(!toEdit) {
            console.log(toEdit);
            $http.post('/templates', ctrl.template).then(
                function(rep) {
                    common.showMessage('Wzór przelewu stworzony');
                    $uibModalInstance.close();
                },
                function(err) {
                    common.showError('Coś poszło nie tak, spróbuj ponownie poźniej');
                    $uibModalInstance.close();
                }
            )
        }
        else {
            console.log(toEdit);
            $http.put(`/templates?id=${ctrl.template.id}`, ctrl.template).then(
                function(rep) {
                    console.log(rep.data);
                    $uibModalInstance.close();
                },
                function(err) {
                    common.showError('Coś poszło nie tak, spróbuj ponownie poźniej');
                    $uibModalInstance.close();
                }
            )
            //$uibModalInstance.dismiss('cancel');
        }
    }
}]);