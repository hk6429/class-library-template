# -*- coding: utf-8 -*-
import html

with open('/Users/naichengchen/projects/class-library-template/Code.gs', 'r', encoding='utf-8') as f:
    gas_code = f.read()

escaped_gas_code = html.escape(gas_code)

with open('/Users/naichengchen/projects/class-library-template/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

placeholder = '// 正在載入 Code.gs 完整內容...'
if placeholder in content:
    content = content.replace(placeholder, escaped_gas_code)
    with open('/Users/naichengchen/projects/class-library-template/index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Embedded Code.gs into index.html successfully!")
else:
    print("Placeholder not found or already replaced.")
