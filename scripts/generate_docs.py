import os
import datetime

MODULES_DIR = 'src/modules'
DOCS_DIR = 'documentation'
DATE = datetime.datetime.now().strftime("%Y-%m-%d")

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)

def list_files(path):
    if not os.path.exists(path):
        return []
    return [f for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]

def generate_markdown(module_name, layer, files):
    content = f"# Documentación del Módulo: {module_name.capitalize()} - Capa {layer.capitalize()}\n"
    content += f"**Fecha:** {DATE}\n\n"
    content += f"## Descripción General\n"
    content += f"Documentación automática de la capa {layer} del módulo {module_name}.\n\n"
    content += f"## Archivos\n"

    if not files:
        content += "No se encontraron archivos en esta capa.\n"
    else:
        for f in files:
            content += f"- `{f}`\n"

    content += "\n## Detalles\n"
    content += "*(Esta sección debe ser completada con detalles específicos de la lógica de negocio, esquemas de datos o componentes UI)*\n"

    return content

def main():
    ensure_dir(DOCS_DIR)

    modules = [d for d in os.listdir(MODULES_DIR) if os.path.isdir(os.path.join(MODULES_DIR, d))]

    index_content = f"# Documentación del Proyecto ChefOS\n**Fecha:** {DATE}\n\n## Módulos\n"

    for module in sorted(modules):
        print(f"Procesando módulo: {module}")
        module_doc_dir = os.path.join(DOCS_DIR, module)
        ensure_dir(module_doc_dir)

        index_content += f"- [{module.capitalize()}](./{module}/README.md)\n"

        # Module README
        with open(os.path.join(module_doc_dir, "README.md"), "w") as f:
            f.write(f"# Módulo {module.capitalize()}\n\n- [Dominio](./domain.md)\n- [Datos](./data.md)\n- [UI](./ui.md)\n")

        # Layers
        for layer in ['domain', 'data', 'ui']:
            layer_path = os.path.join(MODULES_DIR, module, layer)
            files = list_files(layer_path)

            md_content = generate_markdown(module, layer, files)

            with open(os.path.join(module_doc_dir, f"{layer}.md"), "w") as f:
                f.write(md_content)

    with open(os.path.join(DOCS_DIR, "README.md"), "w") as f:
        f.write(index_content)

    print("Documentación generada exitosamente.")

if __name__ == "__main__":
    main()
