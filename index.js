// ================================
// 📌 Dependencias
// ================================
const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

// Inicializar servidor
const app = express();
app.use(express.json());

// ================================
// 📌 Configuración
// ================================
const REGISTRO_CIVIL_URL = 'http://servicios.educacion.gob.ec:80/registro-civil-sw/ServicioWebRegistroCivil';
const PORT = process.env.PORT || 3000;

// ================================
// 📌 Función: Construir SOAP Envelope
// ================================
function buildSoapEnvelope(cedula) {
  return `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://servicios.educacion.gob.ec/registro-civil-sw/ServicioWebRegistroCivil">
      <soapenv:Header/>
      <soapenv:Body>
        <ser:BuscarPersona>
          <cedula>${cedula}</cedula>
        </ser:BuscarPersona>
      </soapenv:Body>
    </soapenv:Envelope>
  `;
}

// ================================
// 📌 Endpoint: Consultar Cédula
// ================================
app.post('/consultar-cedula', async (req, res) => {
  const { cedula } = req.body;

  // Validación rápida de entrada
  if (!cedula || !/^\d{10}$/.test(cedula)) {
    return res.status(400).json({ error: 'Cédula inválida. Debe contener 10 dígitos.' });
  }

  try {
    // Enviar solicitud SOAP
    const soapEnvelope = buildSoapEnvelope(cedula);
    const response = await axios.post(REGISTRO_CIVIL_URL, soapEnvelope, {
      headers: { 'Content-Type': 'text/xml;charset=UTF-8' },
      timeout: 15000 // evita colgarse indefinidamente
    });

    // Parsear primera capa SOAP
    const parsed = await xml2js.parseStringPromise(response.data, { explicitArray: false });
    const rawData = parsed['soap:Envelope']?.['soap:Body']?.['ns2:BuscarPersonaResponse']?.['return'];

    if (!rawData) {
      return res.status(404).json({ error: 'No se encontró información para la cédula.' });
    }

    // Decodificar XML embebido
    const cleanXml = rawData.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const rowParsed = await xml2js.parseStringPromise(cleanXml, { explicitArray: false });
    const datos = rowParsed?.ROW;

    if (!datos) {
      return res.status(404).json({ error: 'No se encontraron datos en la respuesta del Registro Civil.' });
    }

    // Construir respuesta JSON limpia
    const resultado = {
      cedula: datos.CEDULA || null,
      nombre: datos.NOMBRE || null,
      fechaNacimiento: datos.FECHA_NACIMIENTO || null,
      genero: datos.GENERO || null,
      estadoCivil: datos.ESTADO_CIVIL || null,
      profesion: datos.PROFESION || null,
      domicilio: datos.LUGAR_DOMICILIO || null,
      padre: datos.NOMBRE_PADRE || null,
      madre: datos.NOMBRE_MADRE || null
    };

    res.json(resultado);

  } catch (error) {
    console.error('❌ Error al consultar Registro Civil:', error.message);

    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'Tiempo de espera agotado al consultar el Registro Civil.' });
    }

    res.status(500).json({ error: 'Error interno al consultar el Registro Civil.' });
  }
});

// ================================
// 📌 Inicializar servidor
// ================================
app.listen(PORT, () => {
  console.log(`✅ API corriendo en puerto ${PORT}`);
});