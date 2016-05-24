require(data.table)
require(ggplot2)
require(scales)
require(zoo)

# datasource
north <- fread("http://data.giss.nasa.gov/gistemp/tabledata_v3/NH.Ts.csv", na.strings = c("***", "****"))
south <- fread("http://data.giss.nasa.gov/gistemp/tabledata_v3/SH.Ts.csv", na.strings = c("***", "****"))
global <- rbind(north[, type := "North Hemisphere"],
                south[, type := "South Hemisphere"])
global <- melt.data.table(global, id.vars = c("type", "Year"), measure.vars = month.abb)
global <- global[, list(date = as.Date(paste0(year, "-", which(month.abb == month), "-01")),
                        monthid = which(month.abb == month),
                        temperature = as.numeric(value)),
                 by = list(type, year = Year, month = variable)]

g1 <- global[, {
    q1 <- quantile(temperature / 100, c(0, 0.25, 0.5, 0.75, 1), na.rm = TRUE)
    structure(as.list(q1), names = c("c0", "c25", "c50", "c75", "c100"))
}, list(type,
        year = ifelse(month == "Dec", year + 1, year))][year > 1880 & year < 2016]

g2 <- g1[, list(mean = mean(c50),
                year),
         by = list(year_from = ifelse(year >= 1951 & year <= 1980, 1951, 10 * floor((year - 1) / 10) + 1),
                   type)]
g3 <- data.table(type = "North Hemisphere", year = (1951 + 1980) / 2,
                 c50 = g1[, max(c100, na.rm = TRUE)])
ggplot(g1,
       aes(color = type, fill = type, x = year, y = c50)) +
    geom_vline(xintercept = c(1951, 1980), color = "gray50") +
    geom_point(show.legend = FALSE) +
    geom_line(show.legend = FALSE, alpha = 0.5) +
    geom_line(data = g2, alpha = 0.7, size = 1, color = "black", inherit.aes = FALSE, aes(x = year, y = mean, group = year_from)) +
    geom_ribbon(show.legend = FALSE, alpha = 0.3, color = NA, aes(ymin = c0, ymax = c100)) +
    theme_bw() +
    scale_x_continuous("Meteorological year", breaks = global[, seq(min(year), max(year), 10)]) +
    scale_colour_manual("Hemisphere", values = c("blue", "red")) +
    scale_fill_manual("Hemisphere", values = c("blue", "red")) +
    scale_y_continuous("Deviation in degrees from the Global base period") +
    facet_wrap(~ type, ncol = 1) +
    geom_text(data = g3,
              label = "Base period",
              color = "gray",
              show.legend = FALSE) +
    geom_text(data = g2[, list(year = mean(year),
                                                mean = mean[1]),
                        by = list(year_from, type)],
              inherit.aes = FALSE,
              aes(x = year, y = mean, label = paste0(ifelse(mean < 0, "", "+"), round(mean, 3))),
              vjust = -1,
              size = 5)
