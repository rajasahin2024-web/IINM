import sys

file_path = r'c:\Users\sahim\Desktop\IINM_PROJECT\iinm\frontend\src\app\admin\components\SubjectManager.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if i >= 203 and i <= 210:
        continue
    new_lines.append(line)

code_to_insert = """  // -- Fetch -------------------------------------------------
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [catRes, scRes, subjectRes] = await Promise.all([
        apiFetch(`${API}/categories`),
        apiFetch(`${API}/subcategories`),
        apiFetch(
          `${API}/subjects?search=${encodeURIComponent(search)}${
            filterSubcatId !== "all" ? `&subcategory_id=${filterSubcatId}` : ""
          }`
        ),
      ]);
      if (catRes.ok) setCategories(await catRes.json());
      if (scRes.ok) {
        const scs = await scRes.json();
        setSubcategories(scs);
      }
      if (subjectRes.ok) setSubjects(await subjectRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filterSubcatId]);
"""

new_content = ''.join(new_lines[:203]) + code_to_insert + ''.join(new_lines[203:])

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
