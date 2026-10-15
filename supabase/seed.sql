insert into public.branches(name, code) values
('Computer Science and Engineering','CSE'),('Information Technology','IT'),
('Electronics and Communication Engineering','ECE'),('Electrical Engineering','EE'),
('Mechanical Engineering','ME'),('Civil Engineering','CE'),
('Artificial Intelligence and Data Science','AIDS')
on conflict (code) do update set name = excluded.name, is_active = true;

insert into public.subjects(name, code, semester, branch_id)
select seed.name, seed.code, seed.semester, branch.id
from (values
  ('Engineering Mathematics I','MA101',1),('Engineering Mathematics II','MA201',2),
  ('Engineering Physics','PH101',1),('Engineering Chemistry','CH101',1),
  ('Basic Electrical Engineering','EE101',1),('Basic Electronics Engineering','EC101',1),
  ('Programming for Problem Solving','CS101',1),('Data Structures and Algorithms','CS201',3),
  ('Object-Oriented Programming','CS202',3),('Database Management Systems','CS301',5),
  ('Operating Systems','CS302',5),('Computer Networks','CS401',6),
  ('Software Engineering','CS402',6),('Design and Analysis of Algorithms','CS303',5),
  ('Computer Organization and Architecture','CS304',5),('Web Development','CS403',6),
  ('Artificial Intelligence','AI501',7),('Machine Learning','AI502',7)
) as seed(name,code,semester)
cross join public.branches branch
where branch.code in ('CSE','IT','AIDS')
on conflict (name, branch_id, semester) do update set code = excluded.code, is_active = true;
