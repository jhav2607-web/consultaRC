
const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');

const app = express();
app.use(express.json());

app.post('/consultar-cedula', async (req, res) => {
  const cedula = req.body.cedula;

  const soapEnvelope = `
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="http://servicios.educacion.gob.ec/registro-civil-sw/ServicioWebRegistroCivil">
      <soapenv:Header/>
      <soapenv:Body>
        <ser:BuscarPersona>
          <cedula>${cedula}</cedula>
        </ser:BuscarPersona>
      </soapenv:Body>
    </soapenv:Envelope>
  `;

  try {
    const response = await axios.post(
      'http://servicios.educacion.gob.ec:80/registro-civil-sw/ServicioWebRegistroCivil',
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml;charset=UTF-8'
        }
      }
    );

    const xml = response.data;
    const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });

    const rawData = parsed['soap:Envelope']['soap:Body']['ns2:BuscarPersonaResponse']['return'];
    const cleanXml = rawData.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const rowParsed = await xml2js.parseStringPromise(cleanXml, { explicitArray: false });

    const datos = rowParsed.ROW;

    res.json({
      cedula: datos.CEDULA,
      nombre: datos.NOMBRE,
      fechaNacimiento: datos.FECHA_NACIMIENTO,
      genero: datos.GENERO,
      estadoCivil: datos.ESTADO_CIVIL,
      profesion: datos.PROFESION,
      domicilio: datos.LUGAR_DOMICILIO,
      padre: datos.NOMBRE_PADRE,
      madre: datos.NOMBRE_MADRE
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al consultar el Registro Civil' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API corriendo en puerto ${port}`);
});
