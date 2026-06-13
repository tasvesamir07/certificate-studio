import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "design_studio": "Design Studio",
      "library": "Library",
      "upload_template": "1. Upload Template Image",
      "upload_data": "2. Upload Data File (.xlsx)",
      "properties": "Properties",
      "recipients": "Recipients",
      "email_delivery": "Email Delivery",
      "generate_certs": "Generate Certificates",
      "connect_canva": "Connect Canva",
      "logout": "Logout",
    }
  },
  es: {
    translation: {
      "design_studio": "Estudio de Diseño",
      "library": "Biblioteca",
      "upload_template": "1. Subir Imagen de Plantilla",
      "upload_data": "2. Subir Archivo de Datos (.xlsx)",
      "properties": "Propiedades",
      "recipients": "Destinatarios",
      "email_delivery": "Envío de Correo",
      "generate_certs": "Generar Certificados",
      "connect_canva": "Conectar Canva",
      "logout": "Cerrar Sesión",
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
