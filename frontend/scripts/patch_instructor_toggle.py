file_path = r'src\app\admin\components\CourseWizardModal.tsx'

with open(file_path, 'r', encoding='utf-8-sig') as f:
    content = f.read()

content = content.replace('\r\n', '\n')

# Find the exact old block using a unique anchor
marker = 'assigned to this course'
idx = content.find(marker)
if idx == -1:
    print("Marker not found!")
    exit(1)

# Find the closing of the step 4 div after the marker
# We need to find: )}  (closing of formInstructorIds check)
# then </div> (closing of step 4 wrapper)
# then )} (closing of wizardStep === 4 check)

end_of_block = content.find('               )}', idx)
if end_of_block == -1:
    print("End of block not found!")
    exit(1)
    
# Make sure we get the right closing (the one for wizardStep === 4)
# Look for the pattern: \n               )}\n
close_pattern = '\n               )}'
pos = idx
for _ in range(3):  # we need the 3rd closing
    pos = content.find(close_pattern, pos + 1)
    if pos == -1:
        print(f"Could not find closing at iteration")
        break
    print(f"Found closing at pos {pos}: {repr(content[pos:pos+30])}")

# Insert the toggle BEFORE the last </div> and )}
# Find the last </div> and )} before the footer
# The structure is:
#   ...assigned to this course...</span></div>)}   <- instructor summary
#   </div>                                          <- Step 4 wrapper  
#   )}                                              <- wizardStep===4 check

# Let's find the exact insertion point: after the )} of formInstructorIds check
after_instructor_summary = content.find('\n', content.find('                   )}', idx)) 
print(f"After instructor summary newline: {after_instructor_summary}")
print(repr(content[after_instructor_summary:after_instructor_summary+100]))
