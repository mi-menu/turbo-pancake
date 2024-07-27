const axios = require('axios');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
require('dotenv').config();

const DOMAIN = process.env.DOMAIN;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;
const EMAIL_TO = process.env.EMAIL_TO;

let currentIp = '';

async function getPublicIp() {
    console.log('Obteniendo IP pública...');
    const services = [
        'https://api64.ipify.org?format=json',
        'https://httpbin.org/ip',
        'https://ipinfo.io/ip'
    ];

    for (const service of services) {
        try {
            console.log(`Intentando servicio: ${service}`);
            const response = await axios.get(service);
            if (service.includes('ipify') || service.includes('httpbin')) {
                console.log(`IP de ${service}: ${response.data.ip || response.data.origin.trim()}`);
                return response.data.ip || response.data.origin.trim();
            } else {
                console.log(`IP de ${service}: ${response.data.trim()}`);
                return response.data.trim();
            }
        } catch (error) {
            console.warn(`Error al obtener la IP pública de ${service}:`, error.message);
        }
    }

    console.error('Todos los servicios fallaron al obtener la IP pública.');
    return null;
}

async function sendEmail(newIp) {
    let transporter = nodemailer.createTransport({
        host: "smtpout.secureserver.net",
        port: 465,
        secure: true,
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });

    let mailOptions = {
        from: EMAIL_USER,
        to: EMAIL_TO,
        subject: 'Cambio de Dirección IP',
        text: `La dirección IP ha cambiado a ${newIp}.

Por favor, sigue estos pasos para actualizar la configuración DNS:

1. Ve a la página de administración DNS de GoDaddy: https://dcc.godaddy.com/control/dnsmanagement?domainName=${DOMAIN}
2. Inicia sesión con tus credenciales de GoDaddy.
3. Encuentra los registros DNS para tu dominio.
4. Actualiza la dirección IP para los registros '@' y '*' a la nueva dirección IP: ${newIp}.
5. Guarda los cambios.
`
    };
    console.log('Enviando correo...');
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log('Error al enviar el correo:', error);
        } else {
            console.log('Correo enviado:', info.response);
        }
    })
}

async function checkAndUpdateIp() {
    console.log('Comprobando y actualizando la IP...');
    const newIp = await getPublicIp();
    console.log(`IP actual: ${currentIp}`);
    console.log(`Nueva IP: ${newIp}`);
    if (newIp && newIp !== currentIp) {
        await sendEmail(newIp);
        console.log(`La IP ha cambiado de ${currentIp} a ${newIp}`);
        currentIp = newIp;
    } else {
        console.log('La IP no ha cambiado');
    }
}

// Ejecutar la función cada 5 minutos
cron.schedule('*/5 * * * *', () => {
    console.log('Comprobando IP...');
    checkAndUpdateIp();
});

// Comprobación inicial
checkAndUpdateIp();
