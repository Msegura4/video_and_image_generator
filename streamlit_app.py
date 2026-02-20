import streamlit as st
from src.video_generator import VideoGenerator
from prompts.prompt_templates import STYLE_PRESETS as DEFAULT_PRESETS
from flux_image_generator import FluxImageGenerator
from image_to_video import ImageToVideoGenerator
from image_to_video_extend import ImageToVideoExtender
from pathlib import Path
import os
import base64
import json

# Fonction pour charger/sauvegarder les presets personnalisés
def load_custom_presets():
    """Charge les presets personnalisés depuis custom_presets.json"""
    filepath = 'custom_presets.json'
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_custom_preset(preset_id, preset_data):
    """Sauvegarde un preset personnalisé"""
    filepath = 'custom_presets.json'
    presets = load_custom_presets()
    presets[preset_id] = preset_data
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(presets, f, indent=4, ensure_ascii=False)
    return True

def delete_custom_preset(preset_id):
    """Supprime un preset personnalisé"""
    filepath = 'custom_presets.json'
    presets = load_custom_presets()
    if preset_id in presets:
        del presets[preset_id]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(presets, f, indent=4, ensure_ascii=False)
        return True
    return False

def rename_custom_preset(old_id, new_id):
    """Renomme un preset personnalisé"""
    filepath = 'custom_presets.json'
    presets = load_custom_presets()
    
    # Vérifier que l'ancien ID existe et que le nouveau n'existe pas déjà
    if old_id in presets and new_id not in presets and new_id not in DEFAULT_PRESETS:
        # Copier les données avec le nouvel ID
        presets[new_id] = presets[old_id]
        # Supprimer l'ancien ID
        del presets[old_id]
        # Sauvegarder
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(presets, f, indent=4, ensure_ascii=False)
        return True
    return False

def get_all_presets():
    """Récupère tous les presets (défaut + personnalisés)"""
    all_presets = DEFAULT_PRESETS.copy()
    all_presets.update(load_custom_presets())
    return all_presets

# Charger tous les presets
STYLE_PRESETS = get_all_presets()

# Cloudinary (optionnel - vérifie si configuré)
try:
    from cloudinary_manager import CloudinaryManager
    CLOUDINARY_ENABLED = True
except:
    CLOUDINARY_ENABLED = False

st.set_page_config(page_title="🎬 ESPACE DE CRÉATION POUR ROSE PANAMA", layout="wide", initial_sidebar_state="expanded")

# Initialisation session state
if 'current_page' not in st.session_state:
    st.session_state.current_page = "Accueil"

# ==================== SIDEBAR NAVIGATION ====================
with st.sidebar:
    st.title("🎬 ESPACE DE CRÉATION POUR ROSE PANAMA")
    st.markdown("Générateur de video, image, prompt...")
    st.markdown("---")
    
    # Menu de navigation avec boutons
    pages = [
        ("🎥 Générer Vidéo", "generate_video"),
        ("🖼️ Générer Image", "generate_image"),
        ("🎬 Image-to-Video", "image_to_video"),
        ("📄 Étendre Vidéo", "extend_video"),
        ("📂 Tes Créations", "my_creations"),
        ("✏️ Créer Preset", "create_preset"),
        ("📝 Modifier Preset", "edit_preset"),
        ("👁️ Voir Presets", "view_presets"),
        ("💳 Vérifier Crédits", "check_credits"),
        ("⚙️ Configuration", "config")
    ]
    
    for label, page_id in pages:
        # Déterminer le type AVANT d'afficher le bouton
        button_type = "primary" if st.session_state.current_page == label else "secondary"
        
        if st.button(label, key=page_id, use_container_width=True, type=button_type):
            st.session_state.current_page = label
            st.rerun()  # AJOUT : Force le rafraîchissement
    
    st.markdown("---")
    st.caption("v1.0 - Powered by PiAPI")

# ==================== PAGE CONTENT ====================

# PAGE ACCUEIL
if st.session_state.current_page == "Accueil":
    # Supprimer tous les paddings
    st.markdown("""
        <style>
        .main .block-container {
            padding: 0rem;
            max-width: 100%;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Afficher l'image normalement (la méthode la plus fiable)
    st.image("assets/home_image.png", use_container_width=True)

# PAGE 1: GÉNÉRER VIDÉO
elif st.session_state.current_page == "🎥 Générer Vidéo":
    st.header(" Génération de Vidéo")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Paramètres")
        
        preset = st.selectbox(
            "Style Preset",
            options=list(STYLE_PRESETS.keys()),
            format_func=lambda x: x.replace('_', ' ').title()
        )
        
        duration = st.radio("Durée", [5, 10], horizontal=True)
        aspect_ratio = st.selectbox("Format", ["16:9", "9:16", "1:1"])
        mode = st.radio("Qualité", ["professional", "standard"], horizontal=True)
        
        # Preview du preset
        st.markdown("---")
        st.subheader(" Aperçu du Prompt")
        preset_info = STYLE_PRESETS[preset]
        st.text_area("Prompt", preset_info['base'], height=150, disabled=True)
    
    with col2:
        st.subheader("Estimation & Génération")
        
        # Calcul du coût estimé
        if mode == "professional":
            cost = 0.33 if duration == 5 else 0.66
        else:
            cost = 0.26 if duration == 5 else 0.52
        
        st.metric("Coût estimé", f"${cost:.2f}", f"{duration}s {mode}")
        
        # Info sur le temps de génération
        estimated_time = duration * 20
        st.caption(f"Temps estimé : ~{estimated_time}s")
        
        st.markdown("---")
        
        if st.button("Générer la Vidéo", type="primary", use_container_width=True):
            try:
                with st.spinner(f"Génération en cours (~{duration*20}s)..."):
                    gen = VideoGenerator()
                    video_path = gen.generate(
                        preset=preset,
                        duration=duration,
                        aspect_ratio=aspect_ratio,
                        mode=mode
                    )
                
                st.success(" Vidéo générée avec succès !")
                st.video(video_path)
                
                # Auto-upload vers Cloudinary
                if CLOUDINARY_ENABLED:
                    try:
                        with st.spinner("Upload vers Cloudinary..."):
                            from cloudinary_manager import CloudinaryManager
                            manager = CloudinaryManager()
                            
                            result = manager.upload_video(
                                video_path,
                                creation_type="generated",
                                metadata={
                                    "preset": preset,
                                    "duration": duration,
                                    "aspect_ratio": aspect_ratio,
                                    "mode": mode
                                }
                            )
                        
                        st.success("Sauvegardé dans Cloudinary !")
                        st.caption("Retrouve-la dans 'Tes Créations' (clique sur le bouton dans la sidebar)")
                    except Exception as e:
                        # Silencieux - pas grave si upload échoue
                        st.info("Upload Cloudinary ignoré")
                
                with open(video_path, 'rb') as f:
                    st.download_button(
                        " Télécharger la Vidéo",
                        f,
                        file_name=os.path.basename(video_path),
                        mime="video/mp4",
                        use_container_width=True
                    )
            
            except Exception as e:
                st.error(f" Erreur : {e}")


# PAGE 2: GÉNÉRER IMAGE
elif st.session_state.current_page == "🖼️ Générer Image":
    st.header("Génération d'Image (FLUX)")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Paramètres")
        
        prompt = st.text_area(
            "Votre Prompt",
            placeholder="Describe your image in detail...",
            height=150
        )
        
        model = st.selectbox(
            "Modèle FLUX",
            ["flux-pro", "flux-dev", "flux-schnell"],
            format_func=lambda x: {
                "flux-pro": " FLUX Pro (Meilleure qualité)",
                "flux-dev": " FLUX Dev (Équilibré)",
                "flux-schnell": "FLUX Schnell (Rapide)"
            }[x]
        )
        
        size = st.selectbox(
            "Taille",
            ["1024x1024", "1024x768", "768x1024"],
            format_func=lambda x: {
                "1024x1024": "Carré (1024x1024)",
                "1024x768": "Paysage (1024x768)",
                "768x1024": "Portrait (768x1024)"
            }[x]
        )
    
    with col2:
        st.subheader("Estimation & Génération")
        
        # Calcul du coût estimé selon le modèle FLUX
        cost_map = {
            "flux-pro": 0.04,
            "flux-dev": 0.02,
            "flux-schnell": 0.01
        }
        cost = cost_map.get(model, 0.02)
        
        # Temps estimé selon le modèle
        time_map = {
            "flux-pro": 60,
            "flux-dev": 30,
            "flux-schnell": 15
        }
        estimated_time = time_map.get(model, 30)
        
        st.metric("Coût estimé", f"${cost:.2f}", f"{model}")
        st.caption(f"Temps estimé : ~{estimated_time}s")
        
        st.markdown("---")
        
        if st.button("Générer l'Image", type="primary", use_container_width=True):
            if not prompt:
                st.warning("Veuillez entrer un prompt")
            else:
                try:
                    with st.spinner("Génération en cours..."):
                        width, height = map(int, size.split('x'))
                        flux_gen = FluxImageGenerator()
                        image_path = flux_gen.generate_image(prompt, model, width, height)
                    
                    st.success(" Image générée !")
                    st.image(str(image_path), use_container_width=True)
                    
                    # Auto-upload vers Cloudinary
                    if CLOUDINARY_ENABLED:
                        try:
                            from cloudinary_manager import CloudinaryManager
                            manager = CloudinaryManager()
                            
                            with st.spinner("Upload vers Cloudinary..."):
                                result = manager.upload_image(
                                    str(image_path),
                                    metadata={
                                        "prompt": prompt[:100],  # Tronquer si trop long
                                        "model": model,
                                        "size": size
                                    }
                                )
                            st.success("Sauvegardée dans Cloudinary !")
                        except Exception as e:
                            # Silencieux - pas grave si upload échoue
                            print(f"Cloudinary upload failed: {e}")
                    
                    with open(image_path, 'rb') as f:
                        st.download_button(
                            " Télécharger l'Image",
                            f,
                            file_name=os.path.basename(image_path),
                            mime="image/png",
                            use_container_width=True
                        )
                
                except Exception as e:
                    st.error(f" Erreur : {e}")


# PAGE 3: IMAGE-TO-VIDEO
elif st.session_state.current_page == "🎬 Image-to-Video":
    st.header(" Image-to-Video")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Sélection de l'image")
        
        # Option 1 : Upload direct
        uploaded_file = st.file_uploader(
            " Uploader une image",
            type=["png", "jpg", "jpeg", "webp"],
            help="Formats supportés : PNG, JPG, JPEG, WEBP"
        )
        
        # Option 2 : Sélectionner depuis outputs/images/
        st.markdown("**OU**")
        
        images_dir = Path("outputs/images")
        available_images = []
        if images_dir.exists():
            for ext in ['.png', '.jpg', '.jpeg', '.webp']:
                available_images.extend(list(images_dir.glob(f"*{ext}")))
        
        selected_existing = None
        if available_images:
            image_names = ["Aucune"] + [img.name for img in available_images]
            selected_name = st.selectbox("Ou choisir une image existante", image_names)
            if selected_name != "Aucune":
                selected_existing = images_dir / selected_name
        
        # Déterminer quelle image utiliser
        image_to_use = None
        if uploaded_file:
            # Sauvegarder l'upload temporairement
            temp_path = Path("outputs/temp") / uploaded_file.name
            temp_path.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_path, "wb") as f:
                f.write(uploaded_file.getbuffer())
            image_to_use = temp_path
            st.success(f" Image uploadée : {uploaded_file.name}")
        elif selected_existing:
            image_to_use = selected_existing
            st.success(f" Image sélectionnée : {selected_existing.name}")
        
        # Afficher l'aperçu de l'image
        if image_to_use:
            st.image(str(image_to_use), caption="Image source", use_container_width=True)
        
        st.markdown("---")
        
        # Paramètres de génération
        st.subheader("Paramètres")
        
        i2v_prompt = st.text_area(
            "🎬 Prompt de mouvement/animation",
            placeholder="Ex: Slow camera zoom in, cinematic lighting\nSmooth pan from left to right\nCamera moving forward, epic scale",
            height=100,
            help="Décrivez le mouvement de caméra souhaité"
        )
        
        col_dur, col_ratio = st.columns(2)
        with col_dur:
            i2v_duration = st.radio("Durée", [5, 10], horizontal=True)
        with col_ratio:
            i2v_ratio = st.selectbox("Format", ["16:9", "9:16", "1:1"])
        
        i2v_mode = st.radio("Qualité", ["professional", "standard"], horizontal=True)
        
        i2v_model = st.selectbox(
            "Version Kling",
            ["2.5", "2.1", "1.6"],
            format_func=lambda x: f"Kling {x}" + (" (Recommandé)" if x == "2.5" else "")
        )
        
        # Negative prompt (optionnel)
        with st.expander("Negative Prompt (optionnel)"):
            use_negative = st.checkbox("Activer negative prompt")
            if use_negative:
                i2v_negative = st.text_area(
                    "Éléments à éviter",
                    value="people, text, UI, low quality, blurry, distorted",
                    height=80
                )
            else:
                i2v_negative = None
    
    with col2:
        st.subheader("Estimation & Génération")
        
        # Calcul du coût
        if i2v_model == "2.5":
            cost = 0.33 if i2v_duration == 5 else 0.66
        elif i2v_mode == "professional":
            cost = 0.46 if i2v_duration == 5 else 0.92
        else:
            cost = 0.26 if i2v_duration == 5 else 0.52
        
        st.metric("Coût estimé", f"${cost:.2f}", f"{i2v_duration}s {i2v_mode}")
        
        st.markdown("---")
        
        # Bouton de génération
        can_generate = image_to_use is not None and i2v_prompt
        
        if not image_to_use:
            st.warning("Veuillez uploader ou sélectionner une image")
        if not i2v_prompt:
            st.warning("Veuillez entrer un prompt de mouvement")
        
        if st.button(
            "Générer la Vidéo",
            type="primary",
            use_container_width=True,
            disabled=not can_generate
        ):
            try:
                with st.spinner(f"Génération en cours (~{i2v_duration*20}s)..."):
                    i2v_gen = ImageToVideoGenerator()
                    video_path = i2v_gen.generate_video_from_image(
                        image_path=str(image_to_use),
                        prompt=i2v_prompt,
                        duration=i2v_duration,
                        aspect_ratio=i2v_ratio,
                        mode=i2v_mode,
                        model_version=i2v_model,
                        negative_prompt=i2v_negative if use_negative else None
                    )
                
                st.success(" Vidéo générée avec succès !")
                
                # Afficher la vidéo
                st.video(str(video_path))
                
                # Auto-upload vers Cloudinary
                if CLOUDINARY_ENABLED:
                    try:
                        from cloudinary_manager import CloudinaryManager
                        manager = CloudinaryManager()
                        
                        with st.spinner("Upload vers Cloudinary..."):
                            result = manager.upload_video(
                                str(video_path),
                                creation_type="image_to_video",
                                metadata={
                                    "prompt": i2v_prompt[:100],
                                    "duration": i2v_duration,
                                    "aspect_ratio": i2v_ratio,
                                    "mode": i2v_mode,
                                    "model_version": i2v_model
                                }
                            )
                        st.success("Sauvegardée dans Cloudinary !")
                    except Exception as e:
                        # Silencieux - pas grave si upload échoue
                        print(f"Cloudinary upload failed: {e}")
                
                # Bouton de téléchargement
                with open(video_path, 'rb') as f:
                    st.download_button(
                        " Télécharger la Vidéo",
                        f,
                        file_name=os.path.basename(video_path),
                        mime="video/mp4",
                        use_container_width=True
                    )
                
                # Info supplémentaire
                st.info(f"""
                **Vous pouvez maintenant :**
                - Étendre cette vidéo (Option "Étendre Vidéo")
                - 🎬 Générer d'autres variations
                -  Télécharger et partager
                
                **Fichier sauvegardé :** `{os.path.basename(video_path)}`
                """)
            
            except Exception as e:
                st.error(f" Erreur : {e}")
                
                # Afficher le détail de l'erreur si c'est un problème de crédits
                if "credit" in str(e).lower() or "quota" in str(e).lower():
                    st.error("""
                    **Crédits insuffisants**
                    
                    Rechargez votre compte PiAPI :
                    1. https://piapi.ai/workspace/billing
                    2. Add Credits
                    3. Réessayez
                    """)
                else:
                    with st.expander("Détails de l'erreur"):
                        st.code(str(e))


# PAGE 4: ÉTENDRE VIDÉO
elif st.session_state.current_page == "📄 Étendre Vidéo":
    st.header("Extension de Vidéo (Image Chain)")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Sélection Vidéo")
        
        # Option 1 : Upload direct (TOUJOURS AFFICHÉ)
        uploaded_video = st.file_uploader(
            " Uploader une vidéo",
            type=["mp4", "mov", "avi"],
            help="Formats supportés : MP4, MOV, AVI",
            key="video_uploader_extend"
        )
        
        # Option 2 : Sélectionner depuis outputs/ (si disponible)
        st.markdown("**OU**")
        
        # Lister les vidéos disponibles (avec gestion d'erreur)
        outputs_dir = Path("outputs")
        videos = []
        
        try:
            if outputs_dir.exists():
                videos = [v for v in outputs_dir.glob("*.mp4") if not v.stem.startswith("extended_")]
        except Exception as e:
            pass  # Silencieux si erreur
        
        selected_existing_video = None
        
        if videos:
            video_names = ["Aucune"] + [v.name for v in videos]
            selected_video_name = st.selectbox(
                "Ou choisir une vidéo existante (local uniquement)",
                video_names,
                key="video_selector_extend"
            )
            if selected_video_name != "Aucune":
                selected_existing_video = outputs_dir / selected_video_name
        else:
            st.info("Aucune vidéo trouvée en local. Uploadez une vidéo ci-dessus.")
        
        # Déterminer quelle vidéo utiliser
        video_to_extend = None
        
        if uploaded_video:
            # Sauvegarder l'upload temporairement
            temp_path = Path("outputs/temp") / uploaded_video.name
            temp_path.parent.mkdir(parents=True, exist_ok=True)
            with open(temp_path, "wb") as f:
                f.write(uploaded_video.getbuffer())
            video_to_extend = temp_path
            st.success(f" Vidéo uploadée : {uploaded_video.name}")
        elif selected_existing_video:
            video_to_extend = selected_existing_video
            st.success(f" Vidéo sélectionnée : {selected_existing_video.name}")
        
        # Afficher l'aperçu de la vidéo
        if video_to_extend and video_to_extend.exists():
            st.video(str(video_to_extend))
        
        st.markdown("---")
        
        # Paramètres
        st.subheader("Paramètres d'extension")
        
        continuation_prompt = st.text_area(
            "🎬 Prompt de Continuation (optionnel)",
            placeholder="Laissez vide pour auto-optimisation\nOu décrivez la suite souhaitée...",
            height=100,
            help="Le système optimisera automatiquement pour une continuation fluide"
        )
        
        col_dur, col_mode = st.columns(2)
        with col_dur:
            ext_duration = st.radio("Durée Extension", [5, 10], horizontal=True)
        with col_mode:
            ext_mode = st.radio("Mode", ["professional", "standard"], horizontal=True)
        
        # Info sur la méthode
        with st.expander("Comment ça marche ?"):
            st.markdown("""
            **Méthode Image Chain** :
            1. Extraction de la dernière frame
            2.  Upload automatique de l'image
            3. 🎬 Génération continuation (image-to-video)
            4. Concaténation des vidéos
            
            **Avantages** :
            -  Une seule API (PiAPI)
            -  Contrôle du prompt de continuation
            -  Résultat fluide avec cut direct
            """)
    
    with col2:
        st.subheader("Estimation & Extension")
        
        # Calcul du coût
        if ext_mode == "professional":
            cost = 0.33 if ext_duration == 5 else 0.66
        else:
            cost = 0.16 if ext_duration == 5 else 0.32
        
        st.metric("Coût estimé", f"${cost:.2f}", f"{ext_duration}s {ext_mode}")
        
        st.markdown("---")
        
        # Validation
        can_extend = video_to_extend is not None
        
        if not video_to_extend:
            st.warning("Veuillez uploader ou sélectionner une vidéo")
        
        if st.button(
            "Étendre la Vidéo",
            type="primary",
            use_container_width=True,
            disabled=not can_extend
        ):
            try:
                with st.spinner(f" Extension en cours (~{ext_duration*20}s)..."):
                    extender = ImageToVideoExtender()
                    extended_path = extender.extend_video(
                        str(video_to_extend),
                        continuation_prompt=continuation_prompt if continuation_prompt else None,
                        duration=ext_duration,
                        mode=ext_mode
                    )
                
                st.success(" Vidéo étendue avec succès !")
                
                # Afficher la vidéo étendue
                st.video(extended_path)
                
                # Auto-upload vers Cloudinary
                if CLOUDINARY_ENABLED:
                    try:
                        from cloudinary_manager import CloudinaryManager
                        manager = CloudinaryManager()
                        
                        with st.spinner("Upload vers Cloudinary..."):
                            result = manager.upload_video(
                                extended_path,
                                creation_type="extended",
                                metadata={
                                    "original_video": os.path.basename(video_to_extend),
                                    "extension_duration": ext_duration,
                                    "mode": ext_mode,
                                    "continuation_prompt": continuation_prompt[:100] if continuation_prompt else "auto"
                                }
                            )
                        st.success("Sauvegardée dans Cloudinary !")
                    except Exception as e:
                        # Silencieux - pas grave si upload échoue
                        print(f"Cloudinary upload failed: {e}")
                
                # Info sur le résultat
                from video_utils import VideoUtils
                utils = VideoUtils()
                original_duration = utils.get_video_duration(str(video_to_extend))
                final_duration = utils.get_video_duration(extended_path)
                
                st.info(f"""
                **Résultat** :
                - Vidéo originale : {original_duration:.1f}s
                - Extension : +{ext_duration}s
                - Vidéo finale : {final_duration:.1f}s
                
                **Vous pouvez** :
                -  Télécharger la vidéo
                - L'étendre à nouveau
                - 🎬 Générer d'autres variations
                """)
                
                # Bouton de téléchargement
                with open(extended_path, 'rb') as f:
                    st.download_button(
                        " Télécharger la Vidéo Étendue",
                        f,
                        file_name=os.path.basename(extended_path),
                        mime="video/mp4",
                        use_container_width=True
                    )
            
            except Exception as e:
                st.error(f" Erreur : {e}")
                
                # Gestion spécifique des erreurs
                if "FFmpeg" in str(e):
                    st.error("""
                    **FFmpeg requis**
                    
                    Pour utiliser cette fonctionnalité :
                    - macOS : `brew install ffmpeg`
                    - Linux : `sudo apt install ffmpeg`
                    - Windows : Télécharger depuis ffmpeg.org
                    """)
                elif "credit" in str(e).lower() or "quota" in str(e).lower():
                    st.error("""
                    **Crédits insuffisants**
                    
                    Rechargez votre compte PiAPI :
                    1. https://piapi.ai/workspace/billing
                    2. Add Credits
                    3. Réessayez
                    """)
                else:
                    with st.expander("Détails de l'erreur"):
                        st.code(str(e))


# PAGE 5: TES CRÉATIONS
elif st.session_state.current_page == "📂 Tes Créations":
    st.header("Tes Créations")
    
    if not CLOUDINARY_ENABLED:
        st.warning("""
        **Cloudinary non configuré**
        
        Pour activer la galerie de tes créations :
        
        1. **Installer** : `pip install cloudinary`
        2. **Configurer** : Lance `python setup_cloudinary.py`
        3. **Relancer** l'app Streamlit
        
         **Cloudinary gratuit** : 25 GB de stockage
        """)
    else:
        try:
            from cloudinary_manager import CloudinaryManager, format_file_size, format_duration
            manager = CloudinaryManager()
            
            st.success(" Cloudinary connecté")
            
            # Tabs par type de création
            tabs = st.tabs([" Vidéos", "Images", "Statistiques"])
            
            # ==================== TAB 1 : VIDÉOS ====================
            with tabs[0]:
                st.subheader(" Tes Vidéos")
                
                # Filtres
                filter_col1, filter_col2 = st.columns([2, 1])
                
                with filter_col1:
                    video_type = st.selectbox(
                        "Type",
                        ["Toutes", "Générées", "Image-to-Video", "Étendues"],
                        key="video_type_filter"
                    )
                
                with filter_col2:
                    if st.button("Actualiser", use_container_width=True):
                        st.rerun()
                
                # Mapping type creation_type (doit correspondre aux clés dans cloudinary_manager.py)
                type_mapping = {
                    "Toutes": None,
                    "Générées": "generated",
                    "Image-to-Video": "image_to_video",  # Correspond à video_image_to_video
                    "Étendues": "extended"
                }
                
                # Récupérer les vidéos
                with st.spinner(" Chargement..."):
                    videos = manager.list_videos(
                        creation_type=type_mapping[video_type],
                        limit=50
                    )
                
                # DEBUG : Afficher ce qui est retourné
                st.write(f"DEBUG : {len(videos)} vidéo(s) retournée(s)")
                st.write(f"Filtre actif : {video_type} {type_mapping[video_type]}")
                
                if not videos:
                    st.info(f"Aucune vidéo {video_type.lower()} pour le moment.")
                    st.markdown("""
                    **Commence à créer** :
                    - 🎥 Générer Vidéo
                    - Générer Image Image-to-Video
                    - Étendre une vidéo
                    
                    Toutes tes créations apparaîtront ici !
                    """)
                else:
                    st.success(f" {len(videos)} vidéo(s) trouvée(s)")
                    
                    # Afficher en grille (2 colonnes)
                    cols = st.columns(2)
                    
                    for idx, video in enumerate(videos):
                        with cols[idx % 2]:
                            with st.container(border=True):
                                # Vidéo
                                st.video(video["url"])
                                
                                # Infos
                                st.caption(f"{video['filename']}")
                                
                                info_col1, info_col2 = st.columns(2)
                                with info_col1:
                                    st.caption(f"️ {format_duration(video.get('duration', 0))}")
                                with info_col2:
                                    st.caption(f"{format_file_size(video['size'])}")
                                
                                # Actions
                                action_col1, action_col2 = st.columns(2)
                                
                                with action_col1:
                                    st.link_button(
                                        " Télécharger",
                                        video["url"],
                                        use_container_width=True
                                    )
                                
                                with action_col2:
                                    if st.button("Supprimer", key=f"delete_v_{idx}", use_container_width=True):
                                        if manager.delete_file(video["public_id"], "video"):
                                            st.success(" Supprimé !")
                                            st.rerun()
                                        else:
                                            st.error(" Erreur")
            
            # ==================== TAB 2 : IMAGES ====================
            with tabs[1]:
                st.subheader("Tes Images FLUX")
                
                # Actualiser
                if st.button("Actualiser", key="refresh_images"):
                    st.rerun()
                
                # Récupérer les images
                with st.spinner(" Chargement..."):
                    images = manager.list_images(limit=50)
                
                # DEBUG : Afficher ce qui est retourné
                st.write(f"DEBUG : {len(images)} image(s) retournée(s)")
                
                if not images:
                    st.info("Aucune image pour le moment.")
                    st.markdown("""
                    **Génère ta première image** :
                    - Générer Image
                    
                    Toutes tes images FLUX apparaîtront ici !
                    """)
                else:
                    st.success(f" {len(images)} image(s) trouvée(s)")
                    
                    # Afficher en grille (3 colonnes)
                    cols = st.columns(3)
                    
                    for idx, image in enumerate(images):
                        with cols[idx % 3]:
                            with st.container(border=True):
                                # Image avec thumbnail
                                st.image(image["thumbnail"], use_container_width=True)
                                
                                # Infos
                                st.caption(f"{image['filename']}")
                                st.caption(f"{image.get('width', 0)}x{image.get('height', 0)}")
                                st.caption(f"{format_file_size(image['size'])}")
                                
                                # Actions
                                action_col1, action_col2 = st.columns(2)
                                
                                with action_col1:
                                    st.link_button(
                                        "Télécharger",
                                        image["url"],
                                        use_container_width=True
                                    )
                                
                                with action_col2:
                                    if st.button("Supprimer", key=f"delete_i_{idx}", use_container_width=True):
                                        if manager.delete_file(image["public_id"], "image"):
                                            st.success(" Supprimé !")
                                            st.rerun()
                                        else:
                                            st.error(" Erreur")
            
            # ==================== TAB 3 : STATISTIQUES ====================
            with tabs[2]:
                st.subheader("Statistiques de Stockage")
                
                with st.spinner(" Chargement..."):
                    stats = manager.get_storage_stats()
                
                if stats:
                    # Métriques principales
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        st.metric("Créations Totales", stats.get("total_creations", 0))
                    
                    with col2:
                        storage_mb = stats.get("storage_used_mb", 0)
                        storage_pct = (storage_mb / (25 * 1024)) * 100
                        st.metric(
                            "Stockage Utilisé", 
                            f"{storage_mb:.2f} MB",
                            delta=f"{storage_pct:.1f}% de 25 GB"
                        )
                    
                    with col3:
                        bandwidth_mb = stats.get("bandwidth_used_mb", 0)
                        bandwidth_pct = (bandwidth_mb / (25 * 1024)) * 100
                        st.metric(
                            "Bande Passante", 
                            f"{bandwidth_mb:.2f} MB",
                            delta=f"{bandwidth_pct:.1f}% de 25 GB/mois"
                        )
                    
                    # Détails par type
                    st.markdown("---")
                    st.subheader("Par Type")
                    
                    detail_col1, detail_col2 = st.columns(2)
                    
                    with detail_col1:
                        st.metric("🎥 Vidéos Générées", stats.get("videos_generated", 0))
                        st.metric("🎬 Image-to-Video", stats.get("videos_image_to_video", 0))
                    
                    with detail_col2:
                        st.metric("Vidéos Étendues", stats.get("videos_extended", 0))
                        st.metric("Images FLUX", stats.get("images_flux", 0))
                    
                    # Plan Cloudinary
                    st.markdown("---")
                    st.info("""
                     **Plan Cloudinary Gratuit** :
                    -  25 GB de stockage
                    -  25 GB de bande passante / mois
                    -  Transformations illimitées
                    -  CDN global
                    
                    **Dashboard** : https://cloudinary.com/console
                    **Usage** : https://console.cloudinary.com/console/usage
                    """)
                else:
                    st.warning("Impossible de récupérer les statistiques")
        
        except ImportError as e:
            st.error(f" Module manquant : {e}")
            st.info("Lance : `python setup_cloudinary.py`")
        
        except Exception as e:
            st.error(f" Erreur Cloudinary : {e}")
            st.info("Vérifie tes credentials dans .env")
            
            with st.expander("Détails de l'erreur"):
                import traceback
                st.code(traceback.format_exc())


# PAGE 6: CRÉER PRESET
elif st.session_state.current_page == "✏️ Créer Preset":
    st.header("Créer un Nouveau Preset")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        st.subheader("Informations du Preset")
        
        preset_id = st.text_input("ID du Preset", placeholder="mon_style_custom")
        preset_name = st.text_input("Nom", placeholder="Mon Style Personnalisé")
        description = st.text_area("Description", height=80)
        
        st.subheader("Prompt Principal")
        base_prompt = st.text_area(
            "Base Prompt",
            placeholder="Description détaillée de votre style...",
            height=150
        )
        
        negative_prompt = st.text_area(
            "Negative Prompt",
            value="people, text, UI, low quality, blurry",
            height=80
        )
    
    with col2:
        st.subheader("Paramètres Recommandés")
        
        rec_ratio = st.selectbox("Aspect Ratio", ["16:9", "9:16", "1:1"])
        rec_duration = st.radio("Durée", [5, 10])
        rec_mode = st.radio("Mode", ["professional", "standard"])
        
        st.markdown("---")
        st.subheader("Éléments du Style")
        
        color_prompt = st.text_area(
            "Color Palette",
            placeholder="Ex: desaturated earth tones, warm golden hour lighting",
            height=80,
            key="color_prompt_create"
        )
        
        camera_prompt = st.text_area(
            "Camera Movement", 
            placeholder="Ex: slow tracking shot, 35mm anamorphic lens",
            height=80,
            key="camera_prompt_create"
        )
        
        quality_prompt = st.text_area(
            "Quality Settings",
            placeholder="Ex: 8K, film grain, cinematic",
            height=80,
            key="quality_prompt_create"
        )
        
        
        if st.button("Créer le Preset", type="primary", use_container_width=True):
            if not preset_id or not base_prompt:
                st.warning("ID et Base Prompt requis")
            else:
                # Créer le dictionnaire du preset
                new_preset = {
                    "base": base_prompt,
                    "color": color_prompt or "",
                    "camera": camera_prompt or "",
                    "quality": quality_prompt or ""
                }
                
                # Sauvegarder le preset
                try:
                    if save_custom_preset(preset_id, new_preset):
                        st.success(f" Preset '{preset_id}' créé et sauvegardé !")
                        
                        # Afficher un aperçu
                        with st.expander(" Aperçu du preset créé", expanded=True):
                            st.json(new_preset)
                        
                        # Recharger automatiquement après 2 secondes
                        import time
                        time.sleep(2)
                        st.rerun()
                except Exception as e:
                    st.error(f" Erreur lors de la sauvegarde: {str(e)}")


# PAGE 7: MODIFIER PRESET
elif st.session_state.current_page == "📝 Modifier Preset":
    st.header(" Modifier un Preset")
    
    # Vérifier si le preset est personnalisé (modifiable)
    def is_custom_preset(preset_id):
        """Vérifie si un preset est personnalisé"""
        custom = load_custom_presets()
        return preset_id in custom
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        preset_to_edit = st.selectbox(
            "Preset à modifier",
            list(STYLE_PRESETS.keys()),
            format_func=lambda x: x.replace('_', ' ').title()
        )
        
        if preset_to_edit:
            preset_data = STYLE_PRESETS[preset_to_edit]
            is_custom = is_custom_preset(preset_to_edit)
            
            # Afficher le statut
            if is_custom:
                st.success(" Preset personnalisé - Modifiable")
            else:
                st.info(" Preset par défaut - Lecture seule")
            
            st.subheader("Modification")
            new_base = st.text_area(
                "Base", 
                value=preset_data.get('base', ''), 
                height=150,
                disabled=not is_custom
            )
            new_color = st.text_area(
                "Color", 
                value=preset_data.get('color', ''), 
                height=80,
                disabled=not is_custom
            )
            new_camera = st.text_area(
                "Camera", 
                value=preset_data.get('camera', ''), 
                height=80,
                disabled=not is_custom
            )
            new_quality = st.text_area(
                "Quality", 
                value=preset_data.get('quality', ''), 
                height=80,
                disabled=not is_custom
            )
    
    with col2:
        if preset_to_edit:
            st.subheader("Aperçu")
            st.code(f"""
Base: {new_base[:100]}...
Color: {new_color}
Camera: {new_camera}
Quality: {new_quality}
            """)
            
            if is_custom:
                if st.button(" Sauvegarder", type="primary", use_container_width=True):
                    # Créer le dictionnaire du preset modifié
                    updated_preset = {
                        "base": new_base,
                        "color": new_color,
                        "camera": new_camera,
                        "quality": new_quality
                    }
                    
                    # Sauvegarder
                    try:
                        if save_custom_preset(preset_to_edit, updated_preset):
                            st.success(f" Preset '{preset_to_edit}' modifié et sauvegardé !")
                            
                            # Afficher un aperçu
                            with st.expander(" Aperçu du preset modifié", expanded=True):
                                st.json(updated_preset)
                            
                            # Recharger automatiquement après 2 secondes
                            import time
                            time.sleep(2)
                            st.rerun()
                    except Exception as e:
                        st.error(f" Erreur lors de la sauvegarde: {str(e)}")
                
                # Bouton Renommer
                st.markdown("---")
                st.subheader(" Renommer ce preset")
                new_preset_id = st.text_input(
                    "Nouvel ID",
                    value=preset_to_edit,
                    placeholder="nouveau_nom_preset",
                    key="new_preset_id"
                )
                
                if st.button(" Renommer", use_container_width=True):
                    # Vérifications
                    if not new_preset_id:
                        st.error(" Le nouvel ID ne peut pas être vide")
                    elif new_preset_id == preset_to_edit:
                        st.warning(" Le nouvel ID est identique à l'actuel")
                    elif new_preset_id in STYLE_PRESETS:
                        st.error(f" Un preset avec l'ID '{new_preset_id}' existe déjà")
                    else:
                        try:
                            if rename_custom_preset(preset_to_edit, new_preset_id):
                                st.success(f" Preset renommé de '{preset_to_edit}' à '{new_preset_id}' !")
                                import time
                                time.sleep(1)
                                st.rerun()
                            else:
                                st.error(" Erreur lors du renommage")
                        except Exception as e:
                            st.error(f" Erreur: {str(e)}")
                
                # Bouton Supprimer
                st.markdown("---")
                if st.button("️ Supprimer ce preset", type="secondary", use_container_width=True):
                    st.session_state.confirm_delete = True
                
                # Confirmation de suppression
                if st.session_state.get('confirm_delete', False):
                    st.warning(f" Êtes-vous sûr de vouloir supprimer '{preset_to_edit}' ?")
                    col_confirm1, col_confirm2 = st.columns(2)
                    
                    with col_confirm1:
                        if st.button(" Oui, supprimer", type="primary", use_container_width=True):
                            try:
                                if delete_custom_preset(preset_to_edit):
                                    st.success(f" Preset '{preset_to_edit}' supprimé !")
                                    st.session_state.confirm_delete = False
                                    import time
                                    time.sleep(1)
                                    st.rerun()
                                else:
                                    st.error(" Erreur lors de la suppression")
                            except Exception as e:
                                st.error(f" Erreur: {str(e)}")
                    
                    with col_confirm2:
                        if st.button(" Annuler", use_container_width=True):
                            st.session_state.confirm_delete = False
                            st.rerun()
            else:
                if st.button(" Sauvegarder", type="primary", use_container_width=True, disabled=True):
                    pass
                st.warning(" Les presets par défaut ne peuvent pas être modifiés. Créez un nouveau preset à la place.")


# PAGE 8: VOIR PRESETS
elif st.session_state.current_page == "👁️ Voir Presets":
    st.header("Bibliothèque de Presets")
    
    # Affichage en grille
    cols = st.columns(2)
    
    for idx, (preset_name, preset_data) in enumerate(STYLE_PRESETS.items()):
        with cols[idx % 2]:
            with st.expander(f" {preset_name.replace('_', ' ').title()}", expanded=False):
                st.markdown(f"**Base:**")
                st.write(preset_data.get('base', '')[:200] + "...")
                
                st.markdown(f"**Color:** {preset_data.get('color', 'N/A')}")
                st.markdown(f"**Camera:** {preset_data.get('camera', 'N/A')}")
                st.markdown(f"**Quality:** {preset_data.get('quality', 'N/A')}")


# PAGE 9: VÉRIFIER CRÉDITS
elif st.session_state.current_page == "💳 Vérifier Crédits":
    st.header("Crédits PiAPI")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("Mode", "Pay-as-you-go", "")
    
    with col2:
        st.metric("API", "PiAPI", "")
    
    with col3:
        if st.button("Actualiser", use_container_width=True):
            st.rerun()
    
    st.markdown("---")
    
    # Tableau des tarifs détaillé
    st.subheader("Tarifs détaillés")
    
    col_video, col_image = st.columns(2)
    
    with col_video:
        st.markdown("**🎥 Génération Vidéo (Kling)**")
        
        tarifs_video = {
            "5s Professional": "$0.33",
            "10s Professional": "$0.66",
            "5s Standard": "$0.26",
            "10s Standard": "$0.52",
        }
        
        for config, prix in tarifs_video.items():
            st.metric(config, prix, delta=None)
    
    with col_image:
        st.markdown("**Génération Image (FLUX)**")
        
        tarifs_image = {
            "FLUX Pro": "$0.04",
            "FLUX Dev": "$0.02",
            "FLUX Schnell": "$0.01",
        }
        
        for modele, prix in tarifs_image.items():
            st.metric(modele, prix, delta=None)
    
    st.markdown("---")
    
    # Exemples de workflows
    st.subheader("Exemples de coûts complets")
    
    workflows = [
        {
            "name": "Vidéo simple (5s)",
            "steps": ["Génération vidéo 5s Pro"],
            "cost": 0.33
        },
        {
            "name": "Image Vidéo (5s)",
            "steps": ["Image FLUX Pro", "Image-to-Video 5s Pro"],
            "cost": 0.37
        },
        {
            "name": "Image Vidéo étendue (10s)",
            "steps": ["Image FLUX Pro", "Image-to-Video 5s", "Extend 5s Pro"],
            "cost": 0.70
        },
        {
            "name": "Vidéo longue (10s)",
            "steps": ["Génération vidéo 10s Pro"],
            "cost": 0.66
        }
    ]
    
    for workflow in workflows:
        with st.expander(f"{workflow['name']} - ${workflow['cost']:.2f}"):
            st.markdown("**Étapes :**")
            for step in workflow['steps']:
                st.write(f"{step}")
            st.metric("Total", f"${workflow['cost']:.2f}")
    
    st.markdown("---")
    
    st.info("""
    **Vérifiez votre balance sur :**
    - Dashboard : https://piapi.ai/workspace
    - Billing : https://piapi.ai/workspace/billing
    
    **Conseils :**
    - Testez d'abord avec FLUX Schnell ($0.01)
    - Utilisez Standard mode pour les tests
    - Passez en Professional pour la production
    """)


# PAGE 10: CONFIGURATION
elif st.session_state.current_page == "⚙️ Configuration":
    st.header("Configuration")
    
    st.subheader("API Keys")
    
    current_key = os.getenv("PIAPI_API_KEY", "Non configurée")
    masked_key = current_key[:10] + "..." if len(current_key) > 10 else "Non configurée"
    
    st.text_input("PiAPI Key", value=masked_key, disabled=True, type="password")
    
    st.info("""
    **Pour modifier votre clé API :**
    1. Éditez le fichier `.env`
    2. Changez `PIAPI_API_KEY=votre_clé`
    3. Redémarrez l'application
    """)
    
    st.markdown("---")
    
    st.subheader("Dossiers")
    
    col1, col2 = st.columns(2)
    
    with col1:
        outputs_count = len(list(Path("outputs").glob("*.mp4")))
        st.metric("Vidéos générées", outputs_count, "")
    
    with col2:
        images_count = len(list(Path("outputs/images").glob("*.png"))) if Path("outputs/images").exists() else 0
        st.metric("Images générées", images_count, "")