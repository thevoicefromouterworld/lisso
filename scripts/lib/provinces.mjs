// Provincia española a partir de los 2 primeros dígitos del código postal
const P = {
  '01':'Álava','02':'Albacete','03':'Alicante','04':'Almería','05':'Ávila','06':'Badajoz','07':'Baleares','08':'Barcelona','09':'Burgos','10':'Cáceres',
  '11':'Cádiz','12':'Castellón','13':'Ciudad Real','14':'Córdoba','15':'A Coruña','16':'Cuenca','17':'Girona','18':'Granada','19':'Guadalajara','20':'Gipuzkoa',
  '21':'Huelva','22':'Huesca','23':'Jaén','24':'León','25':'Lleida','26':'La Rioja','27':'Lugo','28':'Madrid','29':'Málaga','30':'Murcia',
  '31':'Navarra','32':'Ourense','33':'Asturias','34':'Palencia','35':'Las Palmas','36':'Pontevedra','37':'Salamanca','38':'Santa Cruz de Tenerife','39':'Cantabria','40':'Segovia',
  '41':'Sevilla','42':'Soria','43':'Tarragona','44':'Teruel','45':'Toledo','46':'Valencia','47':'Valladolid','48':'Bizkaia','49':'Zamora','50':'Zaragoza',
  '51':'Ceuta','52':'Melilla'
};
export const provinceFromZip = zip => P[String(zip || '').trim().padStart(5, '0').slice(0, 2)] || null;
/** Zonas sin envío estándar (Canarias, Ceuta, Melilla) */
export const isRemoteZip = zip => ['35', '38', '51', '52'].includes(String(zip || '').trim().padStart(5, '0').slice(0, 2));
