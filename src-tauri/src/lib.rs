use tauri::ipc::{InvokeBody, Request};
use tauri::Manager;

/// Nome seguro para arquivo de imagem: 24 hexadecimais, ponto e extensão curta. Nada de caminho.
fn valid_name(name: &str) -> bool {
    let Some((stem, ext)) = name.split_once('.') else { return false };
    stem.len() == 24
        && stem.bytes().all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase())
        && (1..=5).contains(&ext.len())
        && ext.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit())
}

/// Grava a imagem em `<dados do app>/images/<nome>`. O nome vem do hash do conteúdo, então a mesma imagem não duplica.
#[tauri::command]
fn save_image(app: tauri::AppHandle, request: Request<'_>) -> Result<String, String> {
    let name = request
        .headers()
        .get("x-name")
        .and_then(|v| v.to_str().ok())
        .ok_or("nome ausente")?
        .to_string();
    if !valid_name(&name) {
        return Err("nome de imagem inválido".into());
    }
    let InvokeBody::Raw(bytes) = request.body() else {
        return Err("corpo da imagem ausente".into());
    };
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("images");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(&name);
    if !path.exists() {
        std::fs::write(&path, bytes).map_err(|e| e.to_string())?;
    }
    Ok(name)
}

#[cfg(test)]
mod tests {
    use super::valid_name;

    #[test]
    fn aceita_nome_de_hash() {
        assert!(valid_name("0123456789abcdef01234567.png"));
        assert!(valid_name("0123456789abcdef01234567.jpg"));
    }

    #[test]
    fn recusa_caminho_e_nomes_estranhos() {
        assert!(!valid_name("../0123456789abcdef01234567.png"));
        assert!(!valid_name("0123456789abcdef01234567.png/../x"));
        assert!(!valid_name("0123456789ABCDEF01234567.png"));
        assert!(!valid_name("curto.png"));
        assert!(!valid_name("0123456789abcdef01234567"));
        assert!(!valid_name("0123456789abcdef01234567.PNG"));
        assert!(!valid_name("0123456789abcdef01234567.toolongext"));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![save_image])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Grimo Notes");
}
