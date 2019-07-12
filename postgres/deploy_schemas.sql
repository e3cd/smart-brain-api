-- Deploy fresh database tables
--  \i -- execute scripts, run new files in order of table dependence
\i '/docker-entrypoint-initdb.d/tables/users.sql'
\i '/docker-entrypoint-initdb.d/tables/login.sql'

-- seed data
\i '/docker-entrypoint-initdb.d/seed/seed.sql'