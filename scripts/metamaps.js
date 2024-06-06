/*
*    SDK Javascript para realizar la verificación con Metamaps
*/
const META_CLIENT_ID = '6317c33755df58001cea838f';
const META_SECRET_KEY = 'LKEXC4O3E7ZMIVX7YGLE2P6PQS5H57QR';
const META_FLOW_ID = '6320efd5e0bf79001df41ba8';

const ARRA_FORM_ID = 5;
const ARRA_INE_FRONT_ID = 5;
const ARRA_INE_BACK_ID = 7;
const ARRA_SELFIE_ID = 8;

const ARRA_FORM_HTML_ID = `#gform_${ARRA_FORM_ID}`;
const ARRA_INE_FRONT_HTML_ID = `#input_${ARRA_FORM_ID}_${ARRA_INE_FRONT_ID}`;
const ARRA_INE_BACK_HTML_ID = `#input_${ARRA_FORM_ID}_${ARRA_INE_BACK_ID}`;
const ARRA_SELFIE_HTML_ID = `#input_${ARRA_FORM_ID}_${ARRA_SELFIE_ID}`;

const ARRA_SUBMIT_ID = `#gform_submit_button_${ARRA_FORM_ID}`;

let INE_FRONT = typeof undefined;
let INE_BACK = typeof undefined;
let SELFIE = typeof undefined;

//! SocketIO
let socket = typeof undefined;

let hasError = false;

const ARRA_NAME_PARAM = `#input_${ARRA_FORM_ID}_22`;
const ARRA_SURNAME_PARAM = `#input_${ARRA_FORM_ID}_23`;
const ARRA_SEX_PARAM = `#input_${ARRA_FORM_ID}_20`;
const ARRA_BIRTHDAY_PARAM = `#input_${ARRA_FORM_ID}_18`;
const ARRA_ADDRESS_PARAM = `#input_${ARRA_FORM_ID}_19`;
const ARRA_EMISSION_DATE_PARAM = `#input_${ARRA_FORM_ID}_16`;
const ARRA_DOCUMENT_NUMBER_PARAM = `#input_${ARRA_FORM_ID}_10`;
const ARRA_EXPIRATION_PARAM = `#input_${ARRA_FORM_ID}_17`;
const ARRA_CDE_PARAM = `#input_${ARRA_FORM_ID}_14`;
const ARRA_CURP_PARAM = `#input_${ARRA_FORM_ID}_13`;
const ARRA_NE_PARAM = `#input_${ARRA_FORM_ID}_12`;
const ARRA_OCR_NUMBER_PARAM = `#input_${ARRA_FORM_ID}_11`;

$(document).ready(function() {

    $(ARRA_SUBMIT_ID).toggleClass('hide');

    $(ARRA_SELFIE_HTML_ID).change(function() {
        INE_FRONT = document.querySelector(ARRA_INE_FRONT_HTML_ID).files ? document.querySelector(ARRA_INE_FRONT_HTML_ID).files[0] : typeof undefined;
        INE_BACK = document.querySelector(ARRA_INE_BACK_HTML_ID).files ? document.querySelector(ARRA_INE_BACK_HTML_ID).files[0] : typeof undefined;
        SELFIE = document.querySelector(ARRA_SELFIE_HTML_ID).files ? document.querySelector(ARRA_SELFIE_HTML_ID).files[0] : typeof undefined;
        
        if (SELFIE) {
            if (!INE_FRONT) {
                showMessage('danger', 'Por favor selecciona una imagen del frente de tu INE');
                $(ARRA_SELFIE_HTML_ID).val(null);
            }
            
            if (!INE_BACK) {
                showMessage('danger', 'Por favor selecciona una imagen de la parte trasera de tu INE');
                $(ARRA_SELFIE_HTML_ID).val(null);
            }
            
            if (INE_FRONT && INE_BACK) {
                initProcess();   
            }
        }
    })
});

const initProcess = async () => {
    
    showOrHideLoader();
    
    console.log('Inicia Autenticación');
    const auth = await authMetamaps();

    console.log(' ==> Autenticación', auth);
    
    if (auth) {

        console.log('Inicia Verificacion');
        const startVrf = await startVerificacion(auth);

        console.log(' ==> Verificación', startVrf);
        
        if (startVrf) {
            
            //Se inicializa conexión con el websocket
            webSocketEngine(startVrf);

            console.log('Envío de entradas');
            const entries = await sendEntriesVerification(auth, startVrf);

            console.log(' ==> Resultado entradas', entries);

            checkResult(entries);
        }
    }
}

const authMetamaps = async () => {
    try {
        const response = await $.ajax({
            url: 'https://api.getmati.com/oauth', 
            headers: {
                'accept': 'application/json',
                'content-type': 'application/x-www-form-urlencoded',
                'authorization' : 'Basic ' + btoa(META_CLIENT_ID + ':' + META_SECRET_KEY)
            },
            method: 'POST',
            processData: false,
            data: new URLSearchParams({ 'grant_type' : 'client_credentials' })
        });
        
        return response;
    } catch (ex) {
        showOrHideLoader();
        showMessage('danger', '<strong>ERROR: Auth Failed</strong><br> Ocurri\u00f3 un error en el proceso de verificaci\u00f3n, reintente nuevamente en algunos minutos por favor.');
        $(ARRA_SELFIE_HTML_ID).val(null);
        return null;
    }
};

const startVerificacion = async (authentication) => {
    try {
        const response = await $.ajax({
            url: 'https://api.getmati.com/v2/verifications', 
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'authorization' : 'Bearer ' + authentication.access_token
            },
            method: 'POST',
            processData: false,
            data: JSON.stringify({ 'flowId' : META_FLOW_ID })
        });
        
        return response;
    } catch (ex) {
        showOrHideLoader();
        showMessage('danger', '<strong>ERROR: Init Verification</strong><br> Ocurrió un error en el proceso de inicio de verificación, reintente nuevamente en algunos minutos por favor.');
        $(ARRA_SELFIE_HTML_ID).val(null);
        return null;
    }
};

const sendEntriesVerification = async (authentication, verification) => {
    try {
        let inputs = JSON.stringify([{
                inputType: 'document-photo',
                group: 0,
                data: {
                    type: 'national-id',
                    country: 'MX',
                    page: 'front',
                    filename: INE_FRONT.name
                }
            }, {
                inputType: 'document-photo',
                group: 0,
                data: {
                    type: 'national-id',
                    country: 'MX',
                    page: 'back',
                    filename: INE_BACK.name
                }
            }, {
                inputType: 'selfie-photo',
                data: {
                type: 'selfie-photo',
                filename: SELFIE.name
            }
        }]);
        
        let formData = new FormData();
        
        formData.append('inputs', inputs);
        formData.append('document', INE_FRONT, INE_FRONT.name);
        formData.append('document', INE_BACK, INE_BACK.name);
        formData.append('document', SELFIE, SELFIE.name);
        
        const response = await $.ajax({
            url: `https://api.getmati.com/v2/identities/${verification.identity}/send-input`,
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Accept', 'application/form-data');
                xhr.setRequestHeader('Authorization', `Bearer ${authentication.access_token}`);
            },
            enctype: 'multipart/form-data',
            processData: false,
            contentType: false,
            data: formData
        });
        
        return response;
        
    } catch (ex) {
        showOrHideLoader();
        showMessage('danger', '<strong>ERROR: Send Entries</strong><br> Ocurrió un error en el proceso de verificación de documentos, reintente nuevamente en algunos minutos por favor.');
        $(ARRA_SELFIE_HTML_ID).val(null);
        return null;
    }
};

const checkResult = async (entriesResponse) => {
    let ineFrontVerificationErr = entriesResponse[0].hasOwnProperty('error') ? entriesResponse[0].error : undefined;
    let ineBackVerificationErr = entriesResponse[1].hasOwnProperty('error') ? entriesResponse[1].error : undefined;
    let selfieVerificationErr = entriesResponse[2].hasOwnProperty('error') ? entriesResponse[2].error : undefined;

    console.log(' ==> Responses: ', ineFrontVerificationErr, ineBackVerificationErr, selfieVerificationErr);

    if (ineFrontVerificationErr) {
        hasError = true;
        showMessage('warning', 'No se pudo analizar la sección frontal de la INE: ', getErrorReason(ineFrontVerificationErr.code));
    }

    if (ineBackVerificationErr) {
        hasError = true;
        showMessage('warning', 'No se pudo analizar la sección trasera de la INE: ', getErrorReason(ineBackVerificationErr.code));
    }

    if (selfieVerificationErr) {
        hasError = true;
        showMessage('warning', 'La selfie no coincide con la imagen del documento de identidad');
    }

    if (hasError) {
        showFinalMessage();

        if (socket.connected) {
            //Desconección de cliente
            socket.disconnect();
        }
    }
};

const showMessage = (type, message) => {
    let icon = '';

    if (type === 'success') {
        icon = '<div class="icon"><i class="fa fa-check"></i></div>';
    } else if (type === 'info') {
        icon = '<div class="icon"><i class="fa fa-info-circle"></i></div>';
    } else if (type === 'warning') {
        icon = '<div class="icon"><i class="fa fa-warning"></i></div>';
    } else if (type === 'danger') {
        icon = '<div class="icon"><i class="fa fa-times-circle"></i></div>';
    }
    
    let container = document.querySelector('#container-alert');

    container.insertAdjacentHTML('beforeend', `<div class="meta-alert meta-alert-${type} meta-alert-white rounded"><button type="button" class="close" data-dismiss="meta-alert" aria-hidden="true" onclick=closeElement(this)>&times</button>${icon} ${message}</div>`);
};

const closeElement = (evt) => {
    evt.parentElement.style.display='none';
    console.log(evt);
    evt.parentElement.remove();
};

const showOrHideLoader = () => {
    $(".loading-overlay").toggleClass('is-active');
}

const webSocketEngine = (startVrf) => {

    hasError = false;

    if (socket.connected) {
        //Desconección de cliente
        socket.disconnect();
    }
    
    socket = io('wss://metamaps-arra.herokuapp.com/webhooks-noticer', {
        extraHeaders: {
            authentication: startVrf.id
        }
    });

    socket.on('connect', () => {
        console.log(socket);
        $('#current-process').text(`Connectado con el ID: ${socket.id}`);
    });

    socket.on("disconnect", () => {
        console.log(socket.id);
    });

    socket.on('webhook-from-server', (payload) => {
        const webhook = JSON.parse(payload.webhook);

        console.log(webhook);

        if (webhook.eventName == 'step_completed') {

            switch(webhook.step.id) {
                case 'template-matching':
                    if (!webhook.step.error) {
                        $('#current-process').text('La información personal del documento de identificación fué extraída exitosamente');
                    } else {
                        hasError = true;
                        showMessage('warning', getTemplateMatching(webhook.step.error?.code));
                        $('#current-process').text('');
                    }
                break;
                case 'document-reading':
                    if (!webhook.step.error) {
                        //Setea la información personal en la URL de reedirección del formulario
                        setQueryParamsFormRedirect(webhook.step.data);
                        $('#current-process').text('La información personal del documento de identificación fué extraída exitosamente');
                    } else {
                        hasError = true;
                        showMessage('warning', 'La información personal del documento de identificación no pudo ser extraída');
                        $('#current-process').text('');
                    }
                break;
                case 'age-check':
                    if (!webhook.step.error) {
                        $('#current-process').text('La información personal del documento de identificación fué extraída exitosamente');
                    } else {
                        hasError = true;
                        showMessage('warning', getAgeCheck(webhook.step.error?.code));
                        $('#current-process').text('');
                    }
                break;
                case 'mexican-ine-validation':
                    if (!webhook.step.error) {
                        $('#current-process').text('Nacionalidad del documento de identificación correcta');
                    } else {
                        hasError = true;
                        showMessage('warning', getMexicanIneValidation(webhook.step.error?.code));
                        $('#current-process').text('');
                    }
                break;
                case 'selfie':
                    if (!webhook.step.error) {
                        $('#current-process').text('La selfie coincide debidamente con la imagen del documento de identificación');
                    } else {
                        hasError = true;
                        showMessage('warning', getSelfie(webhook.step.error?.code));
                        $('#current-process').text('');
                    }
                break;
                case 'facematch':
                    if (!webhook.step.error) {
                        $('#current-process').text('El rostro coincide con la imagen del documento de identificación');
                    } else {
                        hasError = true;
                        showMessage('warning', '<strong>Coincidencia de rostro</strong>.<br><small>El rostro no coincide con el documento.</small>');
                        $('#current-process').text('');
                    }
                break;
                case 'alteration-detection':
                    if (!webhook.step.error) {
                        $('#current-process').text('El documento de identificación es válido y no se encontró ningun tipo de alteración');
                    } else {
                        if (webhook.step.error.reasonCode == 'colorCopy') {
                            $('#current-process').text('El documento de identificación es válido');
                        } else {
                            hasError = true;
                            showMessage('warning', getAlterationDetection(webhook.step.error?.reasonCode));
                            $('#current-process').text('');
                        }
                    }
                break;
                default:
                break;
            }
        }

        if (webhook.eventName == 'verification_inputs_completed') {
            $('#current-process').text('Se recibierón todas las entradas requeridas para la verificación de documentos, espere un momento...');
        }

        if (webhook.eventName == 'verification_completed') {
            $('#current-process').text('Fin de la verificación del documento de identificación...');
            showFinalMessage();
        }

        if (webhook.eventName == 'verification_expired') {
            $('#current-process').text('Verificación expirada.');
            setTimeout(() => {
                showOrHideLoader();
                $(ARRA_SELFIE_HTML_ID).val(null);
                $('#current-process').text('');
                showMessage('warning', '<strong>Verificación expirada.</strong><br><small>No se logró llevar a cabo la verificación de los documentos de identidad debido a que la verificación expiró, esto sucede porque alguno de los documentos proporcionados no es valido.</small>');
            }, 3000);
        }
    });
};

const showFinalMessage = () => {
    if (!hasError) {
        $(ARRA_SUBMIT_ID).toggleClass('hide');
        $(ARRA_SUBMIT_ID).toggleClass('show');
        setTimeout(() => {
            $('#current-process').text('');
            showOrHideLoader();
            showMessage('info', 'Proceso de verificación de documentos exitoso, puede continuar con su registro.');
        }, 3000);
    } else {
        $('#current-process').text('');
        showOrHideLoader();
        showMessage('danger', 'Ocurrió un error en el proceso de verificación, por favor revise los documentos que intenta compartir para validar su veracidad.');
        $(ARRA_SELFIE_HTML_ID).val(null);
    }
};

const setQueryParamsFormRedirect = (personalData) => {
    $(ARRA_NAME_PARAM).val(personalData.firstName?.value);
    $(ARRA_SURNAME_PARAM).val(personalData.surname?.value);
    $(ARRA_SEX_PARAM).val(personalData.sex?.value);
    $(ARRA_BIRTHDAY_PARAM).val(personalData.dateOfBirth?.value);
    $(ARRA_ADDRESS_PARAM).val(personalData.address?.value);
    $(ARRA_EMISSION_DATE_PARAM).val(personalData.emissionDate?.value);
    $(ARRA_DOCUMENT_NUMBER_PARAM).val(personalData.documentNumber?.value);
    $(ARRA_EXPIRATION_PARAM).val(personalData.expirationDate?.value);
    $(ARRA_CDE_PARAM).val(personalData.cde?.value);
    $(ARRA_CURP_PARAM).val(personalData.curp?.value);
    $(ARRA_NE_PARAM).val(personalData.ne?.value);
    $(ARRA_OCR_NUMBER_PARAM).val(personalData.ocrNumber?.value);
}

const getTemplateMatching = (code) => {
    const defaultMessage = '<strong>Verificación de plantilla</strong>.<br><small>El documento no coincide con ninguna plantilla válida.</small>';
    if (code) {
        const codes = {
            'templateMatching.noMatchFound': '<strong>Verificación de plantilla</strong>.<br><small>El documento no coincide con ninguna plantilla válida.</small>'
        }
        return codes[code] || defaultMessage;
    }
    return defaultMessage;
}

const getMexicanIneValidation = (code) => {
    const defaultMessage = '<strong>Verificación de nacionalidad</strong>.<br><small>La nacionalidad del documento de identificación no coincide con la nacionalidad mexicana</small>';
    if (code) {
        const codes = {
            'ine.notFound': '<strong>Verificación de nacionalidad</strong>.<br><small>No se encontraron datos de INE.</small>',
            'ine.notEnoughParams': '<strong>Verificación de nacionalidad</strong>.<br><small>No hay suficientes parámetros para obtener datos INE.</small>',
        }
        return codes[code] || defaultMessage;
    }
    return defaultMessage;
}

const getSelfie = (code) => {
    const defaultMessage = '<strong>Verificación de selfie</strong>.<br><small>La selfie no coincide con la imagen del documento de identidad</small>';
    if (code) {
        const codes = {
            'selfieFraudDetection.fraudAttempt': '<strong>Verificación de selfie</strong>.<br><small>Selfie se considera un intento de fraude.</small>',
            'selfieFraudDetection.negligence': '<strong>Verificación de selfie</strong>.<br><small>Selfie se considera negligencia.</small>',
        }
        return codes[code] || defaultMessage;
    }
    return defaultMessage;
}

const getAgeCheck = (code) => {
    const defaultMessage = '<strong>Verificación de edad</strong>.<br><small>Este(a) usuario(a) es actualmente menor de edad.</small>';
    if (code) {
        const codes = {
            'underage.error': '<strong>Verificación de edad</strong>.<br><small>Este(a) usuario(a) es actualmente menor de edad.</small>',
            'underage.noDOB': '<strong>Verificación de edad</strong>.<br><small>No se pudo obtener la fecha de nacimiento.</small>',
        }
        return codes[code] || defaultMessage;
    }
    return defaultMessage;
}

const getAlterationDetection = (reasonCode) => {
    const defaultMessage = '<strong>Alteración Detectada</strong>.<br><small>Debido a una alteración el documento se considera como intento de fraude.</small>';
    if (reasonCode) {
        const reasonsCodes = {
            'digitalPhotoReplacement': '<strong>Alteración Detectada</strong>.<br><small>La foto del documento ha sido alterada digitalmente.</small>',
            'fake': '<strong>Alteración Detectada</strong>.<br><small>La imagen es sintética.<br><small>La información que contiene es irreal.</small>',
            'textReplacement': '<strong>Alteración Detectada</strong>.<br><small>El texto del documento ha sido reemplazado con información diferente.</small>',
            'manualPhotoReplacement': '<strong>Alteración Detectada</strong>.<br><small>La foto del documento ha sido alterada.</small>',
            'differentFrontAndBack': '<strong>Alteración Detectada</strong>.<br><small>La información o el tipo del anverso del documento no coincide con la información o el tipo del reverso.</small>',
            'underage': '<strong>Alteración Detectada</strong>.<br><small>La persona en el documento es menor de edad.</small>',
            'physicalObstruction': '<strong>Alteración Detectada</strong>.<br><small>Hay una obstrucción física que impide ver el documento completo.</small>',
            'digitalObstruction': '<strong>Alteración Detectada</strong>.<br><small>Hay una obstrucción digital que impide ver el documento completo.</small>',
            'blurred': '<strong>Alteración Detectada</strong>.<br><small>La imagen está borrosa que oculta información sobre el documento.</small>',
            'pixelated': '<strong>Alteración Detectada</strong>.<br><small>La imagen está pixelada que oculta información sobre el documento.</small>',
            'screenPhoto': '<strong>Alteración Detectada</strong>.<br><small>La imagen es una imagen de una pantalla donde se almacena el documento.</small>',
            'grayscale': '<strong>Alteración Detectada</strong>.<br><small>La imagen es una copia en blanco y negro del documento.</small>',
            'cropped': '<strong>Alteración Detectada</strong>.<br><small>El documento está recortado.</small>',
            'distorted': '<strong>Alteración Detectada</strong>.<br><small>La imagen está distorsionada, lo que hace que la calidad de la imagen sea deficiente.</small>',
            'sameImages': '<strong>Alteración Detectada</strong>.<br><small>La misma imagen (anverso o reverso) se subió dos veces.</small>',
            'screenshot': '<strong>Alteración Detectada</strong>.<br><small>La imagen es una captura de pantalla.</small>',
            'incorrectDocument': '<strong>Alteración Detectada</strong>.<br><small>El documento subido es incorrecto.</small>',
            'noDocument': '<strong>Alteración Detectada</strong>.<br><small>No hay ningún documento en la imagen</small>.'
        };
        return reasonsCodes[reasonCode] || defaultMessage;
    }
    return defaultMessage;
}

const getErrorReason = (errorCode) => {

    const defaultMessage = '<strong>Error de validación</strong>.<br><small>Los datos proporcionados no pasan la validación. El usuario debe cargar otro archivo de foto.</small>';
    if (errorCode) {
        const detailError = {
            'documentPhoto.badText': '<strong>Error de validación</strong>.<br><small>Error en la validación del campo del documento.</small>',
            'documentPhoto.blurryText': '<strong>Error de validación</strong>.<br><small>La foto del documento está demasiado borrosa.</small>',
            'documentPhoto.smallImageSize': '<strong>Error de validación</strong>.<br><small>La resolución de la foto del documento es demasiado baja.</small>',
            'documentPhoto.unexpectedData': '<strong>Error de validación</strong>.<br><small>Error inesperado en la lectura del documento.</small>',
            'documentPhoto.noText': '<strong>Error de validación</strong>.<br><small>La foto del documento no tiene texto.</small>',
            'documentPhoto.noFace': '<strong>Error de validación</strong>.<br><small>La foto del documento no tiene rostro.</small>',
            'documentPhoto.grayscaleImage': '<strong>Error de validación</strong>.<br><small>La foto del documento está en escala de grises.</small>',
            'documentPhoto.screenPhoto': '<strong>Error de validación</strong>.<br><small>La foto del documento es una captura de pantalla, el usuario debe subir una foto diferente.</small>',
            'documentPhoto.noDocument': '<strong>Error de validación</strong>.<br><small>La foto del documento no coincide con una plantilla de documento conocida.</small>',
            'documentPhoto.missingFields': '<strong>Error de validación</strong>.<br><small>A la foto del documento le faltan algunos campos obligatorios.</small>',
            'documentPhoto.wrongFormat': '<strong>Error de validación</strong>.<br><small>Algunos campos obligatorios del documento utilizan un formato no válido.</small>',
            'documentPhoto.noMrz': '<strong>Error de validación</strong>.<br><small>La fotografía del documento no tiene zona de lectura mecánica.</small>',
            'documentPhoto.badMrz': '<strong>Error de validación</strong>.<br><small>La foto del documento ha dañado la zona de lectura mecánica.</small>',
            'documentPhoto.noPdf417': '<strong>Error de validación</strong>.<br><small>La foto del documento no tiene código de barras PDF417.</small>',
            'documentPhoto.badPdf417': '<strong>Error de validación</strong>.<br><small>La foto del documento tiene un código de barras PDF417 dañado.</small>',
            'documentPhoto.typeMismatch': '<strong>Error de validación</strong>.<br><small>El tipo de documento reclamado por el usuario y el tipo de documento detectado en la foto son diferentes.</small>',
            'documentPhoto.countryMismatch': '<strong>Error de validación</strong>.<br><small>El país del documento reclamado por el usuario y el país del documento detectado a partir de la foto del documento son diferentes.</small>',
            'documentPhoto.croppedDocument': '<strong>Error de validación</strong>.<br><small>Los límites del documento no son completamente visibles en la foto.</small>',
            'documentPhoto.sideMismatch': '<strong>Error de validación</strong.<br><small>El lado reclamado del documento (anverso o reverso) no coincide con el lado enviado.</small>'
        }

        return detailError[errorCode] || defaultMessage;
    }

    return defaultMessage;
};