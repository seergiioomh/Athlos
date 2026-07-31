-- Fecha de nacimiento completa en lugar del año.
--
-- El año se guardaba porque la bienvenida preguntaba la edad, y de una edad
-- no se puede recuperar el día. Preguntando la fecha, la edad se calcula
-- exacta y deja de ser una aproximación.

alter table public.profiles
  add column birth_date date
    check (birth_date between '1920-01-01' and current_date);

-- Los perfiles que ya existan se quedan con el 1 de enero de su año: es lo
-- único deducible, y mejor eso que perder el dato.
update public.profiles
set birth_date = make_date(birth_year, 1, 1)
where birth_year is not null and birth_date is null;

alter table public.profiles
  drop column birth_year;
