import re

with open('src/services/dbService.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern:
# export const funcName = (args): Promise<Type> => {
#     return new Promise(async (resolve, reject) => {
#         const store = await getStore(...);

pattern = re.compile(
    r'export const (\w+)\s*=\s*(\([^{]*?\))\s*:\s*Promise<([^>]+)>\s*=>\s*\{\s*\n\s*return new Promise\(async\s*\(resolve,\s*reject\)\s*=>\s*\{\s*\n\s*const store = await getStore\(([^)]+)\);'
)

def repl(match):
    func_name = match.group(1)
    args = match.group(2)
    ret_type = match.group(3)
    store_args = match.group(4)
    
    # We reconstruct it properly:
    # export const funcName = async (args): Promise<Type> => {
    #     const store = await getStore(...);
    #     return new Promise((resolve, reject) => {
    return (f'export const {func_name} = async {args}: Promise<{ret_type}> => {{\n'
            f'    const store = await getStore({store_args});\n'
            f'    return new Promise((resolve, reject) => {{')

new_content, count = pattern.subn(repl, content)

print(f"Replaced {count} instances.")

with open('src/services/dbService.ts', 'w', encoding='utf-8') as f:
    f.write(new_content)

