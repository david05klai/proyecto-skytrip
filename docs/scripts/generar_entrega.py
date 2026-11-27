#!/usr/bin/env python3
"""Capturas auténticas de GitHub Pages + pruebas E2E + PDF para SkyTrip.
Se ejecuta en GitHub Actions con Playwright y ReportLab.
"""
import json, os, re, sys
from pathlib import Path
from datetime import date, timedelta
from xml.sax.saxutils import escape
from playwright.sync_api import sync_playwright
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Preformatted, KeepTogether, HRFlowable
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs'/'capturas'
OUT.mkdir(parents=True,exist_ok=True)
WEB='https://david05klai.github.io/proyecto-skytrip/'
PDF=ROOT/'docs'/'SkyTrip_Entrega_Corte_3_Final.pdf'
RESULTS=[]
def result(name,ok,detail):
    RESULTS.append({'prueba':name,'correcta':bool(ok),'detalle':str(detail)[:350]})
    print(f"[{'OK' if ok else 'FALLO'}] {name}: {detail}",flush=True)
def snap(page,filename,selector=None):
    path=OUT/filename
    if selector:
        page.locator(selector).first.screenshot(path=str(path),animations='disabled',timeout=20000)
    else:
        page.screenshot(path=str(path),animations='disabled',timeout=20000)
    return path
def run_tests():
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1366,'height':860},device_scale_factor=1)
        page=context.new_page()
        page.set_default_timeout(15000)
        try:
            page.goto(WEB+'index.html',wait_until='domcontentloaded',timeout=35000)
            page.locator('h1').first.wait_for()
            snap(page,'01-inicio.png')
            result('Inicio y publicación',True,page.title())
        except Exception as exc:
            result('Inicio y publicación',False,exc)
        try:
            page.goto(WEB+'explorar.html#countries-section',wait_until='domcontentloaded',timeout=35000)
            page.wait_for_function("document.querySelectorAll('#countries-grid .country-card').length > 0", timeout=45000)
            page.locator('#country-search').fill('Colombia')
            page.wait_for_timeout(900)
            count=page.locator('#countries-grid .country-card').count()
            assert count>=1, 'La búsqueda de Colombia no produjo tarjeta'
            page.locator('label[for="region-americas"]').first.evaluate('(el) => el.click()')
            page.wait_for_timeout(350)
            count2=page.locator('#countries-grid .country-card').count()
            assert count2>=1, 'El filtro América eliminó Colombia'
            snap(page,'02-paises.png','#countries-section')
            result('REST Countries, búsqueda y región',True,f'{count2} tarjeta(s) al buscar Colombia y filtrar América')
        except Exception as exc:
            result('REST Countries, búsqueda y región',False,exc)
            try: snap(page,'02-error-paises.png')
            except Exception: pass
        try:
            page.goto(WEB+'destino-cartagena.html',wait_until='domcontentloaded',timeout=35000)
            page.locator('summary').filter(has_text='Clima y temporada').first.evaluate('(el) => { el.parentElement.open = true; }')
            page.wait_for_function("['success','error'].includes(document.querySelector('[data-weather-status]')?.dataset.state)",timeout=45000)
            weather_status=page.locator('[data-weather-status]').first.inner_text()
            print('Estado Open-Meteo:',weather_status,flush=True)
            assert page.locator('[data-weather-status]').first.get_attribute('data-state')=='success',weather_status
            page.locator('[data-weather-current]:visible').wait_for(timeout=8000)
            temp=page.locator('.weather-now-temperature').first.inner_text()
            assert '°C' in temp
            days=page.locator('[data-weather-forecast] li').count()
            assert days>=3
            snap(page,'03-clima.png','.weather-widget')
            result('Open-Meteo, temperatura y pronóstico',True,f'Temperatura {temp}; {days} días')
            try:
                form=page.locator('[data-weather-search]')
                form.locator('input').fill('Madrid')
                form.locator('[data-weather-search-button]').click()
                page.wait_for_function("document.querySelector('[data-weather-location]').textContent.includes('Madrid')", timeout=30000)
                result('Geocodificación y búsqueda de ciudad',True,'Madrid encontrado y consultado')
            except Exception as exc:
                result('Geocodificación y búsqueda de ciudad',False,exc)
        except Exception as exc:
            result('Open-Meteo, temperatura y pronóstico',False,exc)
            try: snap(page,'03-error-clima.png')
            except Exception: pass
        try:
            page.goto(WEB+'index.html',wait_until='domcontentloaded',timeout=35000)
            fav=page.locator('[data-favorite="cartagena"]').first
            fav.wait_for()
            if fav.get_attribute('aria-pressed')!='true': fav.evaluate('(el) => el.click()')
            assert fav.get_attribute('aria-pressed')=='true'
            page.reload(wait_until='domcontentloaded')
            assert page.locator('[data-favorite="cartagena"]').first.get_attribute('aria-pressed')=='true'
            page.goto(WEB+'favoritos.html',wait_until='domcontentloaded')
            assert page.locator('#fav-cartagena').is_checked()
            snap(page,'04-favoritos.png')
            result('Favoritos + persistencia localStorage',True,'Cartagena permanece guardada después de recargar')
        except Exception as exc:
            result('Favoritos + persistencia localStorage',False,exc)
            try:snap(page,'04-error-favoritos.png')
            except Exception:pass
        try:
            page.goto(WEB+'itinerario.html',wait_until='domcontentloaded',timeout=35000)
            a=date.today()+timedelta(days=10)
            b=a+timedelta(days=2)
            page.locator('#viaje').fill('Ruta de prueba Cartagena')
            page.locator('#inicio').fill(a.isoformat())
            page.locator('#fin').fill(b.isoformat())
            page.locator('#destino').select_option(label='Cartagena')
            page.locator('#viajeros').fill('2')
            page.locator('#presupuesto').fill('1500000')
            page.locator('#preferencias').fill('Explorar Cartagena')
            page.locator('#trip-days textarea').first.wait_for()
            page.locator('#trip-days textarea').first.fill('Visitar la ciudad amurallada')
            snap(page,'05-itinerario.png','#trip-form')
            page.locator('#trip-form button[type="submit"]').click()
            page.locator('#saved-trips .saved-trip').first.wait_for()
            snap(page,'06-viajes.png','#saved-trips')
            page.reload(wait_until='domcontentloaded')
            assert page.locator('#saved-trips .saved-trip').count()>=1
            result('Crear itinerario y conservarlo',True,'Viaje guardado con actividades, visible tras recargar')
            page.locator('#saved-trips .saved-trip button').filter(has_text='Editar').first.click()
            page.locator('#viaje').fill('Ruta editada Cartagena')
            page.locator('#trip-form button[type="submit"]').click()
            assert 'Ruta editada Cartagena' in page.locator('#saved-trips').inner_text()
            result('Editar itinerario',True,'Edición conservada')
            page.once('dialog',lambda d:d.accept())
            page.locator('#saved-trips .saved-trip button').filter(has_text='Eliminar').first.click()
            assert 'Ruta editada Cartagena' not in page.locator('#saved-trips').inner_text()
            result('Eliminar itinerario',True,'Eliminación confirmada')
        except Exception as exc:
            result('Itinerarios: crear, editar y eliminar',False,exc)
            try:snap(page,'06-error-viajes.png')
            except Exception:pass
        try:
            mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True)
            mp=mobile.new_page()
            mp.goto(WEB+'index.html',wait_until='domcontentloaded',timeout=35000)
            mp.locator('h1').first.wait_for()
            snap(mp,'07-movil.png')
            result('Diseño móvil',True,'Captura real de 390 × 844 píxeles')
            mobile.close()
        except Exception as exc:
            result('Diseño móvil',False,exc)
        browser.close()
    (OUT/'estado_pruebas.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2),encoding='utf-8')
def make_pdf():
    regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
    bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
    mono='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
    if Path(regular).exists():
        pdfmetrics.registerFont(TTFont('Dv',regular))
        pdfmetrics.registerFont(TTFont('DvBold',bold))
        pdfmetrics.registerFont(TTFont('DvMono',mono))
    else:
        print('No fonts found',file=sys.stderr)
        return
    navy=HexColor('#162d42'); sea=HexColor('#147894'); gray=HexColor('#586978')
    st=getSampleStyleSheet()
    st.add(ParagraphStyle(name='Cov',fontName='DvBold',fontSize=28,leading=34,textColor=navy,alignment=TA_CENTER,spaceAfter=14))
    st.add(ParagraphStyle(name='SubCov',fontName='Dv',fontSize=13,leading=20,textColor=sea,alignment=TA_CENTER,spaceAfter=18))
    st.add(ParagraphStyle(name='H',fontName='DvBold',fontSize=16,leading=22,textColor=navy,spaceBefore=16,spaceAfter=10,keepWithNext=True))
    st.add(ParagraphStyle(name='SH',fontName='DvBold',fontSize=11,leading=15,textColor=sea,spaceBefore=12,spaceAfter=7,keepWithNext=True))
    st.add(ParagraphStyle(name='T',fontName='Dv',fontSize=9,leading=14.5,textColor=navy,spaceAfter=7))
    st.add(ParagraphStyle(name='L',fontName='Dv',fontSize=8,leading=14,textColor=sea,spaceAfter=8,wordWrap='CJK'))
    st.add(ParagraphStyle(name='Caption',fontName='Dv',fontSize=7.7,leading=12,textColor=gray,spaceAfter=11))
    st.add(ParagraphStyle(name='Mono',fontName='DvMono',fontSize=7,leading=10,textColor=navy,spaceBefore=5,spaceAfter=8))
    doc=SimpleDocTemplate(str(PDF),pagesize=(21*cm,29.7*cm),leftMargin=2.0*cm,rightMargin=2.0*cm,topMargin=1.8*cm,bottomMargin=2.1*cm,title='SkyTrip - Entrega final tercer corte',author='Andrés Tavorda, Eliver Tiapa y Kleiner Madrid')
    story=[]
    def h(x):story.append(Paragraph(escape(x),st['H']))
    def sh(x):story.append(Paragraph(escape(x),st['SH']))
    def p(x):story.append(Paragraph(x,st['T']))
    def l(url):story.append(Paragraph(f'<link href="{escape(url)}" color="#147894">{escape(url)}</link>',st['L']))
    def steps(lines):
        for i,t in enumerate(lines,1):p(f'<b>{i}.</b> {escape(t)}')
    def shot(name,caption,maxheight=8.0):
        path=OUT/name
        if not path.exists():
            p(f'<i>No fue posible obtener la captura para esta sección ({escape(name)}). Consulte el estado de pruebas.</i>')
            return
        from PIL import Image as PILImage
        with PILImage.open(path) as im:
            w,hgt=im.size
        maxw=16.5*cm; maxh=maxheight*cm
        ratio=min(maxw/w,maxh/hgt)
        story.append(Image(str(path),width=w*ratio,height=hgt*ratio))
        story.append(Paragraph(escape(caption)+f' · captura real del sitio publicado ({w} × {hgt} px).',st['Caption']))
    def code_excerpt(path,opening,n=7):
        text=(ROOT/path).read_text(encoding='utf-8')
        pos=text.find(opening)
        if pos<0: return
        lines=text[pos:].splitlines()[:n]
        rows=[line[:105] for line in lines]
        story.append(Preformatted('\n'.join(rows),st['Mono'],maxLineLength=100,splitChars=' .?'))
        story.append(Paragraph('Extracto de '+escape(path)+' (consulta el archivo para la función completa).',st['Caption']))
    def footer(canv,document):
        canv.saveState();w,height=document.pagesize
        canv.setStrokeColor(HexColor('#d8e5eb'));canv.line(2*cm,1.55*cm,w-2*cm,1.55*cm)
        canv.setFont('Dv',7.5);canv.setFillColor(gray)
        canv.drawString(2*cm,1.15*cm,'SkyTrip · Tercer corte · Universidad')
        canv.drawRightString(w-2*cm,1.15*cm,str(document.page))
        canv.restoreState()
    story.append(Spacer(1,3.5*cm))
    story.append(Paragraph('SKYTRIP',st['Cov']))
    story.append(Paragraph('Plataforma inteligente de exploración y planificación de viajes',st['SubCov']))
    story.append(HRFlowable(width='100%',thickness=2,color=sea))
    story.append(Spacer(1,1.0*cm))
    story.append(Paragraph('ENTREGA FINAL · TERCER CORTE',st['SubCov']))
    p('<b>Integrantes:</b> Andrés Tavorda, Eliver Tiapa y Kleiner Madrid')
    p('<b>Fecha:</b> '+date.today().strftime('%d/%m/%Y'))
    p('<b>Contenido:</b> enlaces, manual del usuario con capturas reales, manual del programador y registro de pruebas.')
    story.append(PageBreak())
    h('1. ENLACES DE ENTREGA')
    sh('1.1 Código completo en GitHub');l('https://github.com/david05klai/proyecto-skytrip')
    sh('1.2 Aplicación web desplegada');l(WEB+'index.html')
    sh('1.3 Sustentación en video');l('https://youtu.be/shBnPCukNRo')
    p('El enlace de sustentación se encuentra publicado en la página inicial de SkyTrip. Su contenido y disponibilidad son responsabilidad del alojamiento externo.')
    sh('1.4 Descripción del alcance')
    p('Aplicación web frontend HTML5, CSS3 y JavaScript modular. Consume REST Countries para datos de países y Open-Meteo para clima y búsqueda geográfica. Gestiona favoritos e itinerarios mediante almacenamiento local del navegador, sin servidor ni base de datos propia.')
    h('2. MANUAL DEL USUARIO')
    sh('2.1 Iniciar y navegar')
    steps(['Abrir el enlace del sitio en Chrome, Firefox, Edge o Safari.','Usar la barra superior para entrar en Inicio, Destinos, Favoritos, Itinerario, Perfil o Nosotros.','En dispositivos móviles utilizar el menú desplegable.'])
    shot('01-inicio.png','Figura 1. Página de inicio')
    sh('2.2 Buscar países y filtrar por región')
    steps(['Entrar a Destinos y buscar el bloque Explora países del mundo.','Esperar a que REST Countries entregue datos.','Escribir Colombia u otro país en el buscador.','Elegir América, Europa, Asia, África u Oceanía; usar Mostrar más países para cargar tarjetas adicionales.'])
    shot('02-paises.png','Figura 2. Búsqueda Colombia y filtro América',7.0)
    sh('2.3 Consultar el clima de un destino')
    steps(['Abrir Destinos y entrar a Cartagena.','Desplegar Clima y temporada.','Leer temperatura actual, viento, humedad, condiciones y pronóstico de cinco días.','Escribir otra ciudad y pulsar Buscar para consultar su clima; si hay error, reintentar.'])
    shot('03-clima.png','Figura 3. Widget de Open-Meteo',7.0)
    sh('2.4 Guardar y administrar favoritos')
    steps(['Pulsar Guardar en favoritos desde Inicio, Destinos o una ficha destacada.','Entrar a Favoritos: las tarjetas guardadas aparecen en Mi selección.','Usar la casilla para quitar destinos.','Recargar y verificar que permanecen en el mismo navegador.'])
    shot('04-favoritos.png','Figura 4. Lista de favoritos',6.8)
    sh('2.5 Crear un itinerario')
    steps(['Entrar a Itinerario y escribir el nombre del viaje.','Completar destino, fechas, viajeros, moneda y presupuesto.','Escribir actividades por día en los campos que aparecen después de elegir las fechas.','Pulsar Guardar viaje; la duración debe ser como máximo 60 días.'])
    shot('05-itinerario.png','Figura 5. Formulario para crear itinerario',7.2)
    sh('2.6 Consultar, editar y eliminar itinerarios')
    steps(['Buscar el viaje en Viajes guardados.','Pulsar Ver actividades para revisar los días.','Pulsar Editar, modificar el formulario y Guardar cambios.','Para eliminar, pulsar Eliminar y confirmar.'])
    shot('06-viajes.png','Figura 6. Viaje guardado',6.8)
    sh('2.7 Desde el celular')
    p('La interfaz es adaptable a pantallas pequeñas y mantiene sus secciones de navegación.')
    shot('07-movil.png','Figura 7. Portada móvil',8.5)
    sh('2.8 Advertencias y límites')
    p('Favoritos y viajes permanecen en localStorage del mismo navegador; no se sincronizan entre dispositivos y pueden perderse al borrar los datos. Las APIs necesitan Internet. Los formularios de perfil y contacto son demostrativos. SkyTrip no vende tiquetes ni realiza reservas.')
    story.append(PageBreak())
    h('3. MANUAL DEL PROGRAMADOR')
    sh('3.1 Arquitectura')
    p('Proyecto estático sin backend: HTML y CSS dibujan la interfaz; módulos ES de JavaScript escuchan eventos, consultan APIs REST mediante fetch, actualizan el DOM y usan localStorage para persistencia. Se publica con GitHub Pages desde main.')
    sh('3.2 Organización de archivos')
    for path,desc in [
        ('index.html','Inicio, destinos destacados y buscador internacional'),
        ('explorar.html','Tarjetas, filtros y listado de países'),
        ('destino-*.html','Detalles y widget meteorológico'),
        ('favoritos.html','Lista seleccionada de destinos'),
        ('itinerario.html','Formulario de viajes y historial'),
        ('perfil.html / acerca.html','Páginas informativas o demostrativas'),
        ('styles.css','Diseño general, responsive y componentes'),
        ('assets/js/paises.js','REST Countries, normalización, filtros y tarjetas'),
        ('assets/js/destino-clima.js','Forecast y geocoding de Open-Meteo'),
        ('assets/js/storage.js','Funciones persistentes localStorage'),
        ('assets/js/favoritos.js','Eventos y presentación de favoritos'),
        ('assets/js/itinerario.js','Validaciones, actividades y CRUD')]:
        p(f'<b>{escape(path)}</b> — {escape(desc)}')
    sh('3.3 REST Countries')
    p('Endpoint principal: restcountries.com/v3.1/all con campos name, capital, region, subregion, flags, population, languages, cca2, cca3 y translations. El módulo convierte respuestas de JSON a tarjetas. Normaliza los nombres para buscar sin distinción de tildes y combina búsqueda con filtro de región.')
    code_excerpt('assets/js/paises.js','export async function fetchCountries()',9)
    sh('3.4 API de clima Open-Meteo')
    p('El detalle usa coordenadas data-latitude y data-longitude. El módulo hace la consulta a api.open-meteo.com/v1/forecast para temperatura, viento, humedad y pronóstico; geocoding-api.open-meteo.com/v1/search permite buscar ciudades. AbortController limita la espera y se gestionan los estados de error.')
    code_excerpt('assets/js/destino-clima.js','async function loadWeather(',9)
    sh('3.5 Persistencia y favoritos')
    p('La aplicación utiliza las claves skytrip:favorites:v1 y skytrip:trips:v1. El módulo storage.js encapsula JSON.parse y JSON.stringify, devuelve un arreglo seguro y usa Set para impedir favoritos duplicados. favoritos.js refleja los botones, casillas y contador.')
    code_excerpt('assets/js/storage.js','export function setFavorite(',9)
    sh('3.6 Itinerarios y CRUD')
    p('itinerario.js valida fechas, duración máxima, presupuesto y número de viajeros. renderDays construye campos para actividades por fecha; renderTrips muestra registros y controles para editar y eliminar; saveTrip y deleteTrip mantienen el estado local.')
    code_excerpt('assets/js/itinerario.js',"function renderDays()",9)
    sh('3.7 Ejecución local y despliegue')
    p('Para desarrollar, clonar el repositorio y ejecutar python -m http.server 8000 en la carpeta raíz. Abrir http://localhost:8000/index.html. GitHub Pages publica los mismos archivos bajo /proyecto-skytrip/; no requiere compilación ni paquetes npm.')
    sh('3.8 Limitaciones técnicas')
    p('No existe autenticación real, backend, reservas ni pagos. La capa de favoritos admite los seis destinos destacados; los países dinámicos de REST Countries se ofrecen como consulta. Los servicios externos pueden fallar o cambiar su respuesta.')
    h('4. RESULTADOS DE PRUEBAS AUTOMÁTICAS')
    for x in RESULTS:
        color='#176c49' if x['correcta'] else '#a63b29'
        p(f'<font color="{color}"><b>{"CORRECTO" if x["correcta"] else "PENDIENTE / FALLÓ"}</b></font> · {escape(x["prueba"])}: {escape(x["detalle"])}')
    p('Las capturas de este documento se obtuvieron con Chromium/Playwright desde la dirección pública indicada. Si alguna prueba falló, no debe considerarse funcionalidad verificada.')
    sh('Referencias')
    l('https://restcountries.com/')
    l('https://open-meteo.com/en/docs')
    l('https://open-meteo.com/en/docs/geocoding-api')
    doc.build(story,onFirstPage=footer,onLaterPages=footer)
    print(f'PDF generado: {PDF}, {PDF.stat().st_size} bytes')
if __name__=='__main__':
    # Limpiar capturas antiguas: nunca publicar una imagen obsoleta como actual.
    for old in OUT.glob('*.png'): old.unlink()
    run_tests()
    make_pdf()
    failures=sum(not item['correcta'] for item in RESULTS)
    print(f'Pruebas: {len(RESULTS)-failures}/{len(RESULTS)} OK; {failures} fallo(s)')
    # El PDF y las capturas se mantienen incluso si hay pruebas fallidas
