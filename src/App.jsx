import { useEffect } from "react";
import { initApp } from "./appLogic";

const SCENE_REDIRECT_URL = "https://mccreatorstudio.com/scenecreator";

const characterNameStyle = {
  textAlign: "center",
  fontWeight: "bold",
  marginBottom: "10px",
  minHeight: "20px"
};

export default function App() {
  const isSceneMode = getAppMode() === "scene";

  useEffect(() => {
    if (!isSceneMode) return undefined;
    const cleanup = initApp();
    return () => {
      if (typeof cleanup === "function") cleanup();
    };
  }, [isSceneMode]);

  useEffect(() => {
    if (isSceneMode) return undefined;
    if (shouldRedirectToSceneCreator()) {
      window.location.replace(SCENE_REDIRECT_URL);
      return undefined;
    }
    return initHomeUi();
  }, [isSceneMode]);

  if (!isSceneMode) {
    return (
      <div className="homeLayout">
        <div className="homeBackdrop"></div>
        <div className="topControls">
          <button
            id="themeToggle"
            className="themeToggle"
            aria-label="Toggle theme"
            data-i18n-aria="toggleTheme"
          >
            Light Mode
          </button>
          <div className="languageToggle" aria-label="Language">
            <label htmlFor="languageSelect" data-i18n="languageLabel">
              Language
            </label>
            <select id="languageSelect">
              <option value="en">English</option>
              <option value="fr">Francais</option>
              <option value="es">Espanol</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
          </div>
        </div>
        <header className="homeHero">
          <h1 className="homeTitle" data-i18n="homeTitle">Minecraft Creator Studio</h1>
          <p className="homeSubtitle" data-i18n="homeSubtitle">
            A growing toolbox for Minecraft creators: scene builder, skin editor,
            pose library, and more.
          </p>
        </header>

        <section className="homeGrid">
          <a className="homeCard homeCard--live" href={buildAppUrl("scene")}>
            <div className="homeCardMeta" data-i18n="homeAvailable">Available now</div>
            <h2 className="homeCardTitle" data-i18n="homeSceneTitle">Scene Creator</h2>
            <p className="homeCardDesc" data-i18n="homeSceneDesc">
              Pose characters, craft backgrounds, and export shareable renders.
            </p>
          </a>
          <a className="homeCard homeCard--soon" href={buildAppUrl("skin")}>
            <div className="homeCardMeta" data-i18n="homeComingSoon">Coming soon</div>
            <h2 className="homeCardTitle" data-i18n="homeSkinTitle">Skin Editor</h2>
            <p className="homeCardDesc" data-i18n="homeSkinDesc">
              Paint, shade, and manage skins with a fast, modern workflow.
            </p>
          </a>
          <a className="homeCard homeCard--soon" href={buildAppUrl("poses")}>
            <div className="homeCardMeta" data-i18n="homeComingSoon">Coming soon</div>
            <h2 className="homeCardTitle" data-i18n="homePoseTitle">Pose Library</h2>
            <p className="homeCardDesc" data-i18n="homePoseDesc">
              Browse and save pose presets for quick storytelling.
            </p>
          </a>
          <a className="homeCard homeCard--soon" href={buildAppUrl("assets")}>
            <div className="homeCardMeta" data-i18n="homeComingSoon">Coming soon</div>
            <h2 className="homeCardTitle" data-i18n="homeAssetTitle">Asset Vault</h2>
            <p className="homeCardDesc" data-i18n="homeAssetDesc">
              Collect props, backgrounds, and packs in one shared hub.
            </p>
          </a>
        </section>

        <footer className="homeFooter">
          <span data-i18n="homeFooter">Build on your own pace. Everything lives under one studio.</span>
        </footer>
        <div className="homeCta">
          <span className="homeHint" data-i18n="homeMoreTools">More tools are coming soon.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <a className="homeBackButton" href={buildHomeUrl()}>
        Retour a l'accueil
      </a>
      <div className="topControls">
        <button
          id="themeToggle"
          className="themeToggle"
          aria-label="Toggle theme"
          data-i18n-aria="toggleTheme"
        >
          Light Mode
        </button>
        <div className="languageToggle" aria-label="Language">
          <label htmlFor="languageSelect" data-i18n="languageLabel">
            Language
          </label>
          <select id="languageSelect">
            <option value="en">English</option>
            <option value="fr">Francais</option>
            <option value="es">Espanol</option>
            <option value="de">Deutsch</option>
            <option value="it">Italiano</option>
          </select>
        </div>
      </div>
      <h1 className="appTitle" data-i18n="appTitle">Scene Creator</h1>

      <div className="toolbar">
        <button
          id="penBtn"
          className="toolBtn"
          aria-label="Pen"
          title="Pen"
          data-i18n-aria="toolPen"
          data-i18n-title="toolPen"
        >
          <img src="/icons/pen_button.png" alt="" className="toolIcon" />
        </button>
        <button
          id="lineBtn"
          className="toolBtn toolBtn--line"
          aria-label="Line"
          title="Line"
          data-i18n-aria="toolLine"
          data-i18n-title="toolLine"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" className="toolIcon toolIcon--line">
            <path d="M4 18l16-12" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </button>
        <button
          id="eraserBtn"
          className="toolBtn"
          aria-label="Eraser"
          title="Eraser"
          data-i18n-aria="toolEraser"
          data-i18n-title="toolEraser"
        >
          <img src="/icons/eraser_button.png" alt="" className="toolIcon" />
        </button>
        <div className="shapeControl">
          <button
            id="shapeBtn"
            className="toolBtn"
            aria-label="Shape"
            title="Shape"
            data-i18n-aria="toolShape"
            data-i18n-title="toolShape"
          >
            <img
              src="/icons/shapes_button.png"
              alt=""
              className="toolIcon toolIcon--shape"
            />
          </button>
          <select
            id="shapeSelect"
            className="shapeSelect"
            title="Shape"
            data-i18n-title="toolShape"
          >
            <option value="rect">Rectangle</option>
            <option value="circle">Circle</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>
        <div className="brushControl">
          <label className="brushLabel" htmlFor="brushSize" data-i18n="brushSize">
            Brush Size
          </label>
          <input
            type="range"
            id="brushSize"
            min="1"
            max="100"
            defaultValue="50"
            title="Brush Size"
            data-i18n-title="brushSize"
          />
        </div>
        <input type="color" id="colorPicker" defaultValue="#000000" />
        <button
          id="clearCanvasBtn"
          className="toolBtn"
          aria-label="Clear Canvas"
          title="Clear Canvas"
          data-i18n-aria="clearCanvas"
          data-i18n-title="clearCanvas"
        >
          <img src="/icons/delete_all_button.png" alt="" className="toolIcon" />
        </button>
        <div className="toolbarSpacer"></div>
        <button id="exportBtn" className="btnPrimary exportToolbar" data-i18n="exportScene">
          Export Scene
        </button>
      </div>

      <div className="app">
        <div className="panel-left">
          <div className="panelSection">
            <h3 data-i18n="mySkins">My Skins</h3>
            <div className="skinButtons">
              <button id="loadSteve" className="skinBtn"></button>
              <button id="loadAlex" className="skinBtn"></button>
            </div>
            <input
              type="text"
              id="playerUsername"
              placeholder="Enter a Minecraft name"
              data-i18n-placeholder="enterMinecraftName"
            />
            <button id="fetchSkinBtn" className="btnPrimary" data-i18n="importSkin">
              Import Skin
            </button>
            <input type="file" id="skinUpload" hidden />
            <div id="uploadedSkins">
              <button id="uploadBtn" className="addSkinBtn">
                +
              </button>
            </div>
          </div>


          <div className="panelSection">
            <h3 data-i18n="myPoses">My Poses</h3>
            <button id="savePose" className="btnPrimary" data-i18n="savePose">
              Save Pose
            </button>
            <button id="loadPose" className="btnSecondary" data-i18n="loadPose">
              Load Pose
            </button>
          </div>

          <div className="panelSection">
            <h3 data-i18n="myCharacter">My Character</h3>
            <button id="addCharacter" className="btnPrimary" data-i18n="addCharacter">
              Add Character
            </button>
            <div id="charactersList" className="charactersList"></div>
          </div>
        </div>

        <div id="renderArea">
          <div id="backgroundLayer"></div>
          <canvas id="drawCanvas"></canvas>
          <div id="viewer"></div>
        </div>

        <div className="panel-right-column">
          <div className="panel-bg">
            <h3 data-i18n="background">Background</h3>
            <div className="bgButtons">
              <input type="color" id="bgColorPicker" defaultValue="#000000" />
              <input type="file" id="bgUpload" hidden />
              <button id="bgTransparent" className="btnSecondary" data-i18n="transparent">
                Transparent
              </button>
              <button id="uploadBgBtn" className="btnSecondary" data-i18n="uploadImage">
                Upload Image
              </button>
              <button id="removeBgBtn" className="btnGhost" data-i18n="removeImage">
                Remove Image
              </button>
            </div>
          </div>

          <div className="panel-right">
            <div className="panelSection">
              <div id="characterName" style={characterNameStyle}></div>
            </div>

            <div className="panelSection collapsible" data-section="head">
            <button className="sectionToggle" type="button">
              <span data-i18n="head">Head</span>
              <span className="chev">▾</span>
            </button>
            <div className="sectionContent">
              <input type="range" id="headX" min="-60" max="60" defaultValue="0" />
              <button className="reset" data-part="headX">
                <span data-i18n="resetUpDown">Reset Up/Down</span>
              </button>

              <input type="range" id="headY" min="-90" max="90" defaultValue="0" />
              <button className="reset" data-part="headY">
                <span data-i18n="resetLeftRight">Reset Left/Right</span>
              </button>
            </div>
          </div>

          <div className="panelSection collapsible" data-section="arms">
            <button className="sectionToggle" type="button">
              <span data-i18n="arms">Arms</span>
              <span className="chev">▾</span>
            </button>
            <div className="sectionContent">
              <input
                type="range"
                id="rightArmX"
                min="-180"
                max="180"
                defaultValue="0"
              />
              <input type="range" id="rightArmZ" min="-90" max="90" defaultValue="0" />
              <button className="reset" data-part="rightArm">
                <span data-i18n="resetRightArm">Reset Right Arm</span>
              </button>

              <input
                type="range"
                id="leftArmX"
                min="-180"
                max="180"
                defaultValue="0"
              />
              <input type="range" id="leftArmZ" min="-90" max="90" defaultValue="0" />
              <button className="reset" data-part="leftArm">
                <span data-i18n="resetLeftArm">Reset Left Arm</span>
              </button>
            </div>
          </div>

          <div className="panelSection collapsible" data-section="legs">
            <button className="sectionToggle" type="button">
              <span data-i18n="legs">Legs</span>
              <span className="chev">▾</span>
            </button>
            <div className="sectionContent">
              <input type="range" id="rightLegX" min="-90" max="90" defaultValue="0" />
              <input type="range" id="leftLegX" min="-90" max="90" defaultValue="0" />
              <button className="reset" data-part="legs">
                <span data-i18n="resetLegs">Reset Legs</span>
              </button>
            </div>
          </div>

            <div className="panelSection">
              <button id="resetAll" data-i18n="resetAll">Reset All</button>
            </div>
          </div>
        </div>
      </div>

      <div id="poseGalleryModal">
        <div id="poseGalleryContent"></div>
      </div>

      <div id="appModal" className="appModal" aria-hidden="true">
        <div className="appModalContent" role="dialog" aria-modal="true">
          <h3 id="modalTitle">Modal</h3>
          <p id="modalMessage"></p>
          <label id="modalLabel" htmlFor="modalInput"></label>
          <input id="modalInput" type="text" />
          <div className="appModalActions">
            <button id="modalCancel">Cancel</button>
            <button id="modalConfirm">OK</button>
          </div>
        </div>
      </div>
    </>
  );
}

function shouldRedirectToSceneCreator() {
  if (typeof window === "undefined") return false;
  const { hostname, href } = window.location;
  const hostValue = hostname.toLowerCase();
  const isIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostValue);
  const isLocal = hostValue === "localhost" || hostValue.endsWith(".local") || isIpHost;

  if (isLocal) return false;
  if (href.startsWith(SCENE_REDIRECT_URL)) return false;
  return true;
}

function getAppMode() {
  if (typeof window === "undefined") return "home";
  const { hostname, pathname, search } = window.location;
  const params = new URLSearchParams(search);
  const appParam = params.get("app");
  const hostValue = hostname.toLowerCase();
  if (appParam === "scene") return "scene";
  if (hostValue.startsWith("scene.")) return "scene";
  if (pathname.startsWith("/scene")) return "scene";
  return "home";
}

function buildAppUrl(subdomain) {
  if (typeof window === "undefined") return "#";
  const { protocol, hostname, port } = window.location;
  const hostValue = hostname.toLowerCase();
  const isIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostValue);
  const isLocal = hostValue === "localhost" || hostValue.endsWith(".local") || isIpHost;

  if (isLocal) {
    return `/?app=${subdomain}`;
  }

  const hostParts = hostValue.split(".");
  if (hostParts.length < 2) return `/?app=${subdomain}`;

  const baseDomain = hostParts.slice(-2).join(".");
  const portPart = port ? `:${port}` : "";
  return `${protocol}//${subdomain}.${baseDomain}${portPart}/`;
}

function buildHomeUrl() {
  if (typeof window === "undefined") return "/";
  const { protocol, hostname, port } = window.location;
  const hostValue = hostname.toLowerCase();
  const isIpHost = /^\d{1,3}(\.\d{1,3}){3}$/.test(hostValue);
  const isLocal = hostValue === "localhost" || hostValue.endsWith(".local") || isIpHost;

  if (isLocal) {
    return "/";
  }

  const hostParts = hostValue.split(".");
  if (hostParts.length < 2) return "/";

  const baseDomain = hostParts.slice(-2).join(".");
  const portPart = port ? `:${port}` : "";
  return `${protocol}//${baseDomain}${portPart}/`;
}

const homeTranslations = {
  en: {
    homeTitle: "Minecraft Creator Studio",
    homeSubtitle: "A growing toolbox for Minecraft creators: scene builder, skin editor, pose library, and more.",
    homeAvailable: "Available now",
    homeComingSoon: "Coming soon",
    homeSceneTitle: "Scene Creator",
    homeSceneDesc: "Pose characters, craft backgrounds, and export shareable renders.",
    homeSkinTitle: "Skin Editor",
    homeSkinDesc: "Paint, shade, and manage skins with a fast, modern workflow.",
    homePoseTitle: "Pose Library",
    homePoseDesc: "Browse and save pose presets for quick storytelling.",
    homeAssetTitle: "Asset Vault",
    homeAssetDesc: "Collect props, backgrounds, and packs in one shared hub.",
    homeFooter: "Build on your own pace. Everything lives under one studio.",
    homeMoreTools: "More tools are coming soon.",
    languageLabel: "Language",
    toggleTheme: "Toggle theme",
    lightMode: "Light Mode",
    darkMode: "Dark Mode"
  },
  fr: {
    homeTitle: "Minecraft Creator Studio",
    homeSubtitle: "Une boite a outils pour les createurs Minecraft: scenes, skins, poses, et plus.",
    homeAvailable: "Disponible",
    homeComingSoon: "Bientot",
    homeSceneTitle: "Createur de Scene",
    homeSceneDesc: "Pose des personnages, cree des fonds, et exporte des rendus.",
    homeSkinTitle: "Editeur de Skin",
    homeSkinDesc: "Peins, ombre, et gere tes skins rapidement.",
    homePoseTitle: "Bibliotheque de Poses",
    homePoseDesc: "Parcours et sauvegarde des poses pour tes histoires.",
    homeAssetTitle: "Coffre d'Assets",
    homeAssetDesc: "Regroupe accessoires, fonds, et packs au meme endroit.",
    homeFooter: "Tout au meme endroit, a ton rythme.",
    homeMoreTools: "D'autres outils arrivent bientot.",
    languageLabel: "Langue",
    toggleTheme: "Changer le theme",
    lightMode: "Mode Clair",
    darkMode: "Mode Sombre"
  },
  es: {
    homeTitle: "Minecraft Creator Studio",
    homeSubtitle: "Un conjunto de herramientas para creadores de Minecraft: escenas, skins, poses y mas.",
    homeAvailable: "Disponible",
    homeComingSoon: "Muy pronto",
    homeSceneTitle: "Creador de Escenas",
    homeSceneDesc: "Posa personajes, crea fondos y exporta renders compartibles.",
    homeSkinTitle: "Editor de Skins",
    homeSkinDesc: "Pinta, sombrea y gestiona skins con un flujo rapido.",
    homePoseTitle: "Biblioteca de Poses",
    homePoseDesc: "Explora y guarda poses para tus historias.",
    homeAssetTitle: "Boveda de Assets",
    homeAssetDesc: "Reune accesorios, fondos y packs en un solo lugar.",
    homeFooter: "Todo en un solo estudio, a tu ritmo.",
    homeMoreTools: "Mas herramientas muy pronto.",
    languageLabel: "Idioma",
    toggleTheme: "Cambiar tema",
    lightMode: "Modo Claro",
    darkMode: "Modo Oscuro"
  },
  de: {
    homeTitle: "Minecraft Creator Studio",
    homeSubtitle: "Ein Werkzeugkasten fur Minecraft-Creator: Szenen, Skins, Posen und mehr.",
    homeAvailable: "Jetzt verfugbar",
    homeComingSoon: "Bald",
    homeSceneTitle: "Szenen-Editor",
    homeSceneDesc: "Posiere Charaktere, baue Hintergrunde und exportiere Render.",
    homeSkinTitle: "Skin-Editor",
    homeSkinDesc: "Malen, schattieren und Skins schnell verwalten.",
    homePoseTitle: "Posen-Bibliothek",
    homePoseDesc: "Durchsuche und speichere Posen fur Storytelling.",
    homeAssetTitle: "Asset-Tresor",
    homeAssetDesc: "Sammle Props, Hintergrunde und Packs zentral.",
    homeFooter: "Alles in einem Studio, in deinem Tempo.",
    homeMoreTools: "Weitere Tools folgen bald.",
    languageLabel: "Sprache",
    toggleTheme: "Thema wechseln",
    lightMode: "Heller Modus",
    darkMode: "Dunkler Modus"
  },
  it: {
    homeTitle: "Minecraft Creator Studio",
    homeSubtitle: "Una cassetta degli attrezzi per creator Minecraft: scene, skin, pose e altro.",
    homeAvailable: "Disponibile",
    homeComingSoon: "In arrivo",
    homeSceneTitle: "Creatore di Scene",
    homeSceneDesc: "Poni personaggi, crea sfondi ed esporta render.",
    homeSkinTitle: "Editor di Skin",
    homeSkinDesc: "Dipingi, ombreggia e gestisci skin rapidamente.",
    homePoseTitle: "Libreria Pose",
    homePoseDesc: "Sfoglia e salva pose per storytelling.",
    homeAssetTitle: "Archivio Asset",
    homeAssetDesc: "Raccogli oggetti, sfondi e pack in un hub unico.",
    homeFooter: "Tutto in un unico studio, al tuo ritmo.",
    homeMoreTools: "Altri strumenti in arrivo.",
    languageLabel: "Lingua",
    toggleTheme: "Cambia tema",
    lightMode: "Modalita Chiara",
    darkMode: "Modalita Scura"
  }
};

function initHomeUi() {
  const languageSelect = document.getElementById("languageSelect");
  const themeToggle = document.getElementById("themeToggle");

  let currentLanguage = localStorage.getItem("language") || "en";
  const t = key => homeTranslations[currentLanguage]?.[key] || homeTranslations.en[key] || key;

  const updateThemeLabel = () => {
    if (!themeToggle) return;
    const isLight = document.body.classList.contains("light");
    themeToggle.textContent = isLight ? t("darkMode") : t("lightMode");
  };

  const applyLanguage = nextLanguage => {
    if (nextLanguage) currentLanguage = nextLanguage;
    localStorage.setItem("language", currentLanguage);
    if (languageSelect) languageSelect.value = currentLanguage;

    document.querySelectorAll("[data-i18n]").forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(el => {
      el.setAttribute("aria-label", t(el.dataset.i18nAria));
    });

    updateThemeLabel();
  };

  const setTheme = theme => {
    document.body.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
    updateThemeLabel();
  };

  applyLanguage(currentLanguage);
  setTheme(localStorage.getItem("theme") || "dark");

  if (themeToggle) {
    themeToggle.onclick = () => {
      const isLight = document.body.classList.contains("light");
      setTheme(isLight ? "dark" : "light");
    };
  }

  if (languageSelect) {
    languageSelect.onchange = e => applyLanguage(e.target.value);
  }

  return () => {
    if (themeToggle) themeToggle.onclick = null;
    if (languageSelect) languageSelect.onchange = null;
  };
}
